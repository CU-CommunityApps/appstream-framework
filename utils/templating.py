import cPickle as pickle
from hashlib import md5
from os import path

from awacs.aws import (
    Action,
    Allow,
    Condition,
    Policy as PolicyDocument,
    Principal,
    Statement,
    StringEquals,
)

from awacs.sts import AssumeRole

from troposphere import (
    AWSObject,
    Export,
    GetAtt,
    ImportValue,
    Output,
    Ref,
    Sub,
    Tags,
    Template,
)

from troposphere.apigateway import (
    BasePathMapping,
    Deployment,
    DomainName,
    Integration,
    IntegrationResponse,
    Method,
    MethodResponse,
    MethodSetting,
    Resource,
    RestApi,
    Stage,
)

from troposphere.awslambda import (
    Alias,
    Code,
    DeadLetterConfig,
    Environment,
    Function,
    Permission,
    TracingConfig,
    VPCConfig,
)

# Alter awslambda.Function to enable `aws cloudformation package`
Function.props['Code'] = ((Code, basestring), True) 

from troposphere.certificatemanager import (
    Certificate,
)

from troposphere.dynamodb import (
    AttributeDefinition, 
    KeySchema, 
    ProvisionedThroughput, 
    Table,
)

from troposphere.iam import (
    Policy,
    Role,
)

from troposphere.s3 import (
    Bucket,
    VersioningConfiguration,
)

class ApiBaseTemplate(Template):

    def __init__(self, utils, templatePath='./cloudformation/api.json', description='Top Level API Gateway Template for {App}', version='2010-09-09'):
        super(self.__class__, self).__init__()

        self.utils = utils
        self.templatePath = templatePath
        appName = self.utils.config['App']
        domainName = self.utils.config['Domain']
        tags = self.utils.config['Tags']

        self.add_version(version)
        self.add_description(description.format(App=appName))

        ###################
        # ACM Certificate #
        ###################

        self.certificate = self.add_resource(Certificate(
            '{App}Certificate'.format(App=appName),
            DomainName=domainName,
            SubjectAlternativeNames=['*.{Domain}'.format(Domain=domainName)],
            Tags=Tags(tags),
        ))

        #####################
        # Deployment Bucket #
        #####################

        self.bucket = self.add_resource(Bucket(
            '{App}DeploymentBucket'.format(App=appName),
            DeletionPolicy='Retain',
            Tags=Tags(tags),
            VersioningConfiguration=VersioningConfiguration(
                Status='Enabled',
            ),            
        ))

        ###########
        # RestApi #
        ###########

        self.api = self.add_resource(RestApi(
            '{App}Api'.format(App=appName),
            Name=appName + 'Api',
            Description='API for {App} AWS SAML Login Redirection'.format(App=appName),
        ))

        ##################
        # RestApi Domain #
        ##################

        self.apiDomain = self.add_resource(DomainName(
            '{App}ApiDomainName'.format(App=appName),
            CertificateArn=Ref(self.certificate),
            DomainName=domainName,
        ))

        self.apiDomainMapping = self.add_resource(BasePathMapping(
            '{App}ApiDomainNameMapping'.format(App=appName),
            DomainName=Ref(self.apiDomain),
            RestApiId=Ref(self.api),
        ))

        ###########
        # Outputs #
        ###########

        self.add_output(Output(
            '{App}Api'.format(App=appName),
            Value=Ref(self.api),
            Export=Export(
                '{App}Api'.format(App=appName),
            ),
        ))

        self.add_output(Output(
            '{App}ApiDomainName'.format(App=appName),
            Value=Ref(self.apiDomain),
            Export=Export(
                '{App}ApiDomainName'.format(App=appName),
            ),
        ))

        self.add_output(Output(
            '{App}ApiDomainDistribution'.format(App=appName),
            Value=GetAtt(self.apiDomain, 'DistributionDomainName'),
            Export=Export(
                '{App}ApiDomainDistribution'.format(App=appName),
            ),
        ))

        self.add_output(Output(
            '{App}ApiRoot'.format(App=appName),
            Value=GetAtt(self.api, 'RootResourceId'),
            Export=Export(
                '{App}ApiRoot'.format(App=appName),
            ),
        ))

        self.add_output(Output(
            '{App}Certificate'.format(App=appName),
            Value=Ref(self.certificate),
            Export=Export(
                '{App}Certificate'.format(App=appName),
            ),
        ))

        self.add_output(Output(
            '{App}DeploymentBucket'.format(App=appName),
            Value=Ref(self.bucket),
            Export=Export(
                '{App}DeploymentBucket'.format(App=appName),
            ),
        ))

        ##################
        # Write Template #
        ##################

        with open(templatePath, 'w') as templateFile:
            templateFile.write(self.to_json())

class ApiStageTemplate(Template):
    
    def __init__(self, utils, templatePath='./cloudformation/stage.json', description='API Gateway Stage Template for {App}-{Stage}', version='2010-09-09'):
        super(self.__class__, self).__init__()

        self.utils = utils
        self.templatePath = templatePath
        appName = self.utils.config['App']
        stageName = self.utils.config['Stage']
        tags = self.utils.config['Tags']

        self.add_version(version)
        self.add_description(description.format(App=appName, Stage=stageName))

        ####################
        # Lambda Functions #
        ####################

        self.lambdaFunctions = []
        self.lambdaFunctionRoles = []

        for functionId in self.utils.config['LambdaFunctions'].keys():
            f = self.utils.config['LambdaFunctions'][functionId]

            functionName =  '{App}Stage{FunctionId}Function{Stage}'.format(App=appName, FunctionId=functionId, Stage=stageName)
            policyName =    '{App}Stage{FunctionId}FunctionPolicy{Stage}'.format(App=appName, FunctionId=functionId, Stage=stageName)
            roleName =      '{App}Stage{FunctionId}FunctionRole{Stage}'.format(App=appName, FunctionId=functionId, Stage=stageName)

            functionSubParams = {
                'FunctionName': functionName,
                'Api': ImportValue('{App}Api'.format(App=appName)),
                'Stage': stageName.lower(),
            }
    
            #################
            # Function Role #
            #################

            with open('./lambda/policies/{FunctionId}.json'.format(FunctionId=functionId), 'r') as functionPolicyJson:
                functionPolicyDocument = functionPolicyJson.read()

            functionPolicy = Policy(
                policyName,
                PolicyName=policyName,
                PolicyDocument=Sub(functionPolicyDocument, **functionSubParams),
            )

            functionRole = self.add_resource(Role(
                roleName,
                AssumeRolePolicyDocument=PolicyDocument(
                    Statement=[
                        Statement(
                            Effect=Allow,
                            Action=[AssumeRole],
                            Principal=Principal('Service', [
                                'lambda.amazonaws.com',
                            ]),
                        )
                    ],
                ),
                Path='/service-role/{App}/{Stage}/'.format(App=appName, Stage=stageName),
                Policies=[functionPolicy],
                RoleName=roleName,
            ))

            lambdaFunction = self.add_resource(Function(
                functionName,
                Code=path.abspath(f['LocalCode']),
                Description='API Proxy Function for Stage: {App}-{Stage}'.format(App=appName, Stage=stageName),
                FunctionName=functionName,
                Handler=f['Handler'],
                MemorySize=f['Memory'],
                Role=GetAtt(functionRole, 'Arn'),
                Runtime=f['Runtime'],
                Timeout=f['Timeout'],
                Tags=Tags(tags),
            ))

            lambdaEnvironment = {
                'APP_NAME': appName,
                'STAGE_NAME': stageName,
            }
            
            if f['Environment'] != None:
                lambdaEnvironment.update(f['Environment'])

            lambdaFunction.Environment = Environment(
                Variables=lambdaEnvironment,
            )

            if f['KmsKeyArn'] != None:
                lambdaFunction.KmsKeyArn = f['KmsKeyArn']

            if f['Vpc'] != None:
                lambdaFunction.VpcConfig = VpcConfig(
                    SecurityGroupIds=f['Vpc']['SecurityGroupIds'],
                    SubnetIds=f['Vpc']['SubnetIds'],
                )

            if f['Tracing'] != None:
                lambdaFunction.TracingConfig = TracingConfig(
                    Mode=f['Tracing'],
                )

            self.lambdaFunctions.append(lambdaFunction)
            self.lambdaFunctionRoles.append(functionRole)

        ##################
        # Lambda Proxies #
        ##################

        self.proxyResources = []
        self.proxyMethods = []
        self.proxyMethodTitles = []
        self.proxyPermissions = []

        for resourceName in self.utils.config['LambdaProxies'].keys():
            resource = self.utils.config['LambdaProxies'][resourceName]
            resourcePath = resource['Path'].strip()
            functionName = '{App}Stage{FunctionName}Function{Stage}'.format(App=appName, FunctionName=resource['Function'], Stage=stageName)

            resourceSubParams = {
                'FunctionName': functionName,
                'Api': ImportValue('{App}Api'.format(App=appName)),
                'Stage': stageName.lower(),
            }
    
            if resourcePath == '':
                proxyParent = ImportValue('{App}ApiRoot'.format(App=appName))
                resourceSubParams['ResourcePath'] = '*'

            else:
                resourceSubParams['ResourcePath'] = resourcePath + '/*'

                #################    
                # Path Resource #
                #################

                pathResource = self.add_resource(Resource(
                    '{App}Stage{ResourceName}PathResource{Stage}'.format(App=appName, ResourceName=resourceName, Stage=stageName),
                    ParentId=ImportValue('{App}ApiRoot'.format(App=appName)),
                    PathPart=resource['Path'],
                    RestApiId=ImportValue('{App}Api'.format(App=appName)),
                ))

                self.proxyResources.append(pathResource)
                proxyParent = Ref(pathResource)
                
            ###############
            # Path Method #
            ###############

            pathMethod = self.add_resource(self.generate_proxy_method(
                '{App}Stage{ResourceName}PathMethod{Stage}'.format(App=appName, ResourceName=resourceName, Stage=stageName),
                resource['Auth'],
                resourceSubParams,
                proxyParent,
                ImportValue('{App}Api'.format(App=appName)),
            ))                

            self.proxyMethods.append(pathMethod)
            self.proxyMethodTitles.append(pathMethod.title)

            ##################
            # Proxy Resource #
            ##################

            proxyResource = self.add_resource(Resource(
                '{App}Stage{ResourceName}ProxyResource{Stage}'.format(App=appName, ResourceName=resourceName, Stage=stageName),
                ParentId=proxyParent,
                PathPart='{proxy+}',
                RestApiId=ImportValue('{App}Api'.format(App=appName)),
            ))

            self.proxyResources.append(proxyResource)

            ################
            # Proxy Method #
            ################

            proxyMethod = self.add_resource(self.generate_proxy_method(
                '{App}Stage{ResourceName}ProxyMethod{Stage}'.format(App=appName, ResourceName=resourceName, Stage=stageName),
                resource['Auth'], 
                resourceSubParams, 
                Ref(proxyResource), 
                ImportValue('{App}Api'.format(App=appName)),
            ))

            self.proxyMethods.append(proxyMethod)
            self.proxyMethodTitles.append(proxyMethod.title)

            ####################
            # Proxy Permission #
            ####################

            proxyPermission = self.add_resource(Permission(
                '{App}Stage{ResourceName}Permission{Stage}'.format(App=appName, ResourceName=resourceName, Stage=stageName),
                Action='lambda:InvokeFunction',
                FunctionName=functionName,
                Principal='apigateway.amazonaws.com',
                SourceArn=Sub('arn:${AWS::Partition}:execute-api:${AWS::Region}:${AWS::AccountId}:${Api}/${Stage}/*/${ResourcePath}', **resourceSubParams),
                DependsOn=[functionName],
            ))    

            self.proxyPermissions.append(proxyPermission)

        #################
        # RestApi Stage #
        #################

        hashComponents = [self.proxyResources, self.proxyMethods]
        deploymentHash = md5(pickle.dumps(hashComponents)).hexdigest()

        self.deployment = self.add_resource(Deployment(
            '{App}StageDeployment{Stage}{Hash}'.format(App=appName, Stage=stageName, Hash=deploymentHash),
            Description='Deployment for {App} {Stage} Stage'.format(App=appName, Stage=stageName),
            RestApiId=ImportValue('{App}Api'.format(App=appName)),
            DependsOn=self.proxyMethodTitles,
        ))

        self.prodStage = self.add_resource(Stage(
            '{App}Stage'.format(App=appName),
            DeploymentId=Ref(self.deployment),
            Description='Stage for {App} {Stage} Stage.'.format(App=appName, Stage=stageName, Run=self.utils.run_time),
            MethodSettings=[
                MethodSetting(
                    DataTraceEnabled=True,
                    HttpMethod='*',
                    LoggingLevel='INFO',
                    ResourcePath='/*',
                    #MetricsEnabled=True,
                ),
            ],
            RestApiId=ImportValue('{App}Api'.format(App=appName)),
            StageName=stageName.lower(),
        ))

        ##################
        # Write Template #
        ##################

        with open(templatePath, 'w') as templateFile:
            templateFile.write(self.to_json())

    def generate_proxy_method(self, name, auth, uriParams, resource, api):
        return Method(
            name,
            AuthorizationType=auth,
            HttpMethod='ANY',
            Integration=Integration(
                IntegrationHttpMethod='POST',
                Type='AWS_PROXY',
                Uri=Sub('arn:${AWS::Partition}:apigateway:${AWS::Region}:lambda:path/2015-03-31/functions/arn:${AWS::Partition}:lambda:${AWS::Region}:${AWS::AccountId}:function:${FunctionName}/invocations', **uriParams),
            ),
            ResourceId=resource,
            RestApiId=api,
        )

