import logging
import yaml
from boto3.session import Session
from botocore.exceptions import ClientError, WaiterError
from datetime import datetime, timedelta
from sys import stdout

class GoUtils:

    def __init__(self, args):
        self.args = args
        self.run_time = datetime.now().strftime('%Y%m%d%H%M%S')
        self.acceptable_stack_states = ['CREATE_COMPLETE', 'UPDATE_COMPLETE', 'UPDATE_ROLLBACK_COMPLETE']
        self.init_logging()
        self.init_aws()

        with open('config.yml', 'r') as frameworkYAML:
            self.config = yaml.load(frameworkYAML)

    def init_aws(self):
        if self.args.profile:
            self.aws = Session(profile_name=self.args.profile, region_name=self.args.region)
        else:
            self.aws = Session(region_name=self.args.region)

        self.cfn = self.aws.resource('cloudformation')
        self.s3 = self.aws.resource('s3')

    def init_logging(self):
        log_levels = { 'DEBUG': logging.DEBUG, 'INFO': logging.INFO, 'WARNING': logging.WARNING, 'ERROR': logging.ERROR, 'CRITICAL': logging.CRITICAL }

        self.logger = logging.getLogger()
        self.logger.setLevel(log_levels[self.args.log_level])

        sh = logging.StreamHandler(stdout)
        sh.setLevel(log_levels[self.args.log_level])
        formatter = logging.Formatter('[%(levelname)s] %(asctime)s %(message)s')
        sh.setFormatter(formatter)
        self.logger.addHandler(sh)

        logging.getLogger('boto').propagate = False
        logging.getLogger('boto3').propagate = False
        logging.getLogger('botocore').propagate = False

    def summarize_change_set(self, stack_name, change_set_name):
        change_set = self.cfn.meta.client.describe_change_set(ChangeSetName=change_set_name, StackName=stack_name)
        change_template = (
            '\tResource: {resource} ({type})\n'
            '\tAction: {action}\n'
            '{details}\n\n\a'
        )
        details_template = (
            '\tMust Replace: {replace}\n'
            '\tTarget: {target}\n'
            '\tSource: {source}\n'
        )

        change_summary = '\n\nChanges:\n\n'
        for change in change_set['Changes']:
            resource = change['ResourceChange']
            details = ''

            if resource['Action'] == 'Modify':
                for detail in resource['Details']:
                    details = details_template.format(
                        replace=resource['Replacement'],
                        target=detail['Target']['Name'],
                        source=detail['ChangeSource'],
                    ) 

            change_summary += change_template.format(
                resource=resource['LogicalResourceId'],
                type=resource['ResourceType'],
                action=resource['Action'],
                details=details,
            )

        return change_summary

    def deploy_template(self, stack_name, template, tags):
        from troposphere import Tags    

        try:
            stack = self.cfn.create_stack(
                StackName=stack_name,
                TemplateBody=template.to_json(),
                Tags=Tags(tags).tags,
                Capabilities=[
                    'CAPABILITY_IAM',
                    'CAPABILITY_NAMED_IAM',
                ],
            )

            stack_exists = self.cfn.meta.client.get_waiter('stack_exists')
            stack_exists.wait(StackName=stack_name)

            try:
                self.logger.info('Creating {stack} Stack...'.format(stack=stack_name))
                stack_complete = self.cfn.meta.client.get_waiter('stack_create_complete')
                stack_complete.wait(StackName=stack_name)                

            except:
                self.logger.error('Stack Error or Timeout')

            else:
                self.logger.info('Stack Deployed!\a')

        except ClientError as e:
            if e.response['Error']['Code'] == 'AlreadyExistsException':
                stack = list(self.cfn.stacks.filter(StackName=stack_name))[0]

                if self.args.update and stack.stack_status in self.acceptable_stack_states:
                    change_set_name = '{stack}-{runtime}'.format(stack=stack_name, runtime=self.run_time)
                    self.logger.info('Creating Change Set for Existing Stack: ' + change_set_name)

                    self.cfn.meta.client.create_change_set(
                        StackName=stack_name,
                        ChangeSetName=change_set_name,
                        TemplateBody=template.to_json(),
                        Tags=Tags(tags).tags,
                        Capabilities=[
                            'CAPABILITY_IAM',
                            'CAPABILITY_NAMED_IAM',
                        ],
                    )

                    try:
                        change_set_created = self.cfn.meta.client.get_waiter('change_set_create_complete')
                        change_set_created.wait(ChangeSetName=change_set_name, StackName=stack_name)

                    except:
                        change_set = self.cfn.meta.client.describe_change_set(ChangeSetName=change_set_name, StackName=stack_name)
                        self.logger.warning('Change Set Creation Failed: {reason}'.format(reason=change_set['StatusReason']))
                        self.cfn.meta.client.delete_change_set(ChangeSetName=change_set_name, StackName=stack_name)

                    else:
                        self.logger.warning(self.summarize_change_set(stack_name, change_set_name))

                        yn = ''
                        while yn.lower() not in ['y', 'n']:
                            yn = raw_input('Do you want to execute this change set? [y/n]: ')

                        if yn == 'y':
                            self.logger.info('Executing {stack} Change Set: {change}'.format(stack=stack_name, change=change_set_name))
                            self.cfn.meta.client.execute_change_set(ChangeSetName=change_set_name, StackName=stack_name)

                            stack_updated = self.cfn.meta.client.get_waiter('stack_update_complete')
                            stack_updated.wait(StackName=stack_name)
                            self.logger.info('Change Set Deployed!\a')

                        else:
                            self.cfn.meta.client.delete_change_set(ChangeSetName=change_set_name, StackName=stack_name)

                else:
                    self.logger.info('Using Existing Stack: ' + stack_name)

            else:
                raise e

        return stack

    def get_framework_template(self):

        from troposphere import (
            GetAtt,
            Ref,
            Sub,
            Tags,
            Template,
        )

        from troposphere.apigateway import (
            Deployment,
            DomainName,
            Integration,
            IntegrationResponse,
            Method,
            MethodResponse,
            Resource,
            RestApi,
            Stage,
        )

        from troposphere.ec2 import (
            VPCEndpoint,
        )

        from troposphere.s3 import (
            Bucket,
            BucketPolicy,
            VersioningConfiguration,
        )

        t = Template()

        ###############
        # API Gateway #
        ###############

        api = t.add_resource(RestApi(
            'ApiGateway',
            Name=self.args.stack + 'Api',
            Description='API for portal and redirects for the Cornell AppStream Service',            
        ))

        ###########################
        # API Gateway Root Method #
        ###########################

        with open('./include/root_integration_template.html', 'r') as rootTemplateHTML:
            rootTemplate = rootTemplateHTML.read()

        root_method = t.add_resource(Method(
            'ApiGatewayRootMethod',
            AuthorizationType='None',
            HttpMethod='ANY',
            Integration=Integration(
                Type='MOCK',
                IntegrationResponses=[
                    IntegrationResponse(
                        ResponseParameters={
                            'method.response.header.Content-Type': "'text/html'",
                        },
                        ResponseTemplates={
                            'text/html': rootTemplate,
                        },
                        StatusCode='200',
                    ),
                ],
                #PassthroughBehavior=
                RequestTemplates={
                    'application/json': '{"statusCode":200}'
                },
            ),
            MethodResponses=[
                MethodResponse(
                    ResponseParameters={
                        'method.response.header.Content-Type': True,
                    },
                    StatusCode='200',
                ),
            ],
            ResourceId=GetAtt(api, 'RootResourceId'),
            RestApiId=Ref(api),
        ))

        #####################
        # API Gateway Stage #
        #####################

        api_deployment = t.add_resource(Deployment(
            'ApiGatewayDeployment' + self.run_time,
            Description='Deployment for API portal and redirects for the Cornell AppStream Service',
            RestApiId=Ref(api),
        ))

        api_stage = t.add_resource(Stage(
            'ApiGatewayStage',
            DeploymentId=Ref(api_deployment),
            Description='Stage for API portal and redirects for the Cornell AppStream Service',
            RestApiId=Ref(api),
            StageName='apps',
        ))

        ###################
        # VPC S3 Endpoint #
        ###################

        s3_endpoint = t.add_resource(VPCEndpoint(
            'S3VPCEndpoint',
            ServiceName=Sub('com.amazonaws.${AWS::Region}.s3'),
            VpcId=self.config['VPC'],
            RouteTableIds=self.config['RouteTables'],
        ))

        ####################
        # S3 Bucket Policy #
        ####################

        sub_args = { 'bucket_name': self.config['Bucket'], 'vpc_id': self.config['VPC'] }
        with open('./include/bucket_policy.json', 'r') as bucketPolicyJSON:
            bucket_policy_document = bucketPolicyJSON.read()

        bucket_policy = t.add_resource(BucketPolicy(
            'FrameworkBucketPolicy',
            Bucket=self.config['Bucket'],
            PolicyDocument=Sub(bucket_policy_document, **sub_args),
        ))

        with open('./cloudformation/framework.json', 'w') as frameworkTemplate:
            frameworkTemplate.write(t.to_json())

        return t
