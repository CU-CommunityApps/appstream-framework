from time import sleep
import json

BUCKET_NAME = 'cu-deng-appstream-packages'

BASE_IMAGE = 'Base-Image-Builder-09-05-2017'
INSTANCE_TYPE = 'stream.standard.large'
SECURITY_GROUPS = ['sg-2cac0057']
SUBNETS = ['subnet-26742f0c']
OU = 'OU=auto-deploy,OU=image-builders,OU=appstream,OU=cu-deng,OU=AWS-Landing,OU=Cloudification,OU=UnitObjects,OU=CIT-ENT,OU=DelegatedObjects,DC=cornell,DC=edu'

class Builder:

    def __init__(self, utils):
        self.utils = utils
        self.builder_name = 'autodeploy-{0}'.format(self.utils.run_time)

    def deploy_image_config(self):
        image_config = {
            'packages': self.utils.args.packages,
        }

        s3obj = self.utils.s3.Object(BUCKET_NAME, 'build/{0}.json'.format(self.builder_name))
        s3obj.put(Body=json.dumps(image_config))

        self.utils.logger.info('Put Image Configuration to S3: {bucket}/{key}'.format(
            bucket=s3obj.bucket_name,
            key=s3obj.key,
        ))

    def deploy_image_builder(self):
        self.utils.logger.info('Creating Image Builder: {0}'.format(self.builder_name))
        
        self.utils.appstream.create_image_builder(
            Name=self.builder_name,
            ImageName=BASE_IMAGE,
            InstanceType=INSTANCE_TYPE,
            EnableDefaultInternetAccess=False,
            VpcConfig={
                'SubnetIds': SUBNETS,
                'SecurityGroupIds': SECURITY_GROUPS,
            },
            DomainJoinInfo={
                'DirectoryName': 'cornell.edu',
                'OrganizationalUnitDistinguishedName': OU,
            },
        )

        while True:
            builder_info = self.utils.appstream.describe_image_builders(
                Names=[self.builder_name],
            )['ImageBuilders'][0]

            if builder_info['State'] != 'PENDING':
                break

            sleep(30)

        if builder_info['State'] != 'RUNNING':
            self.utils.logger.error('Image Builder did not successfully start. Status: {status}\n{code}: {reason}'.format(
                status=builder_info['State'],
                code=builder_info['StateChangeReason']['Code'],
                reason=builder_info['StateChangeReason']['Message'],
            ))
            return False
            
        else:
            self.utils.logger.info('Image Builder Running: {0}'.format(self.builder_name))
            return True
