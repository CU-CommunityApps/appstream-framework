#!/usr/bin/env python

from argparse import ArgumentParser
from utils import GoUtils

parser = ArgumentParser(description='Cornell University AWS AppStream 2.0 Framework')

parser.add_argument('-s', '--stack', type=str, default='AppstreamFramework', help='The CFN Stack Name to use. Default: appstream-framework')
parser.add_argument('-d', '--deploy', action='store_true', help='Deploy the template to CFN.')
parser.add_argument('-u', '--update', action='store_true', help='Update existing stack.')

parser.add_argument('-p', '--profile', type=str, default=None, help='The AWS account profile to use. Only needed if not on an EC2 instance in the desired account with the proper Instance Profile')
parser.add_argument('-r', '--region', type=str, default='us-east-1', help='The AWS region to use. Default: us-east-1')
parser.add_argument('-l', '--log_level', type=str, default='INFO', help='Log Level for Go Script. Default: INFO')

args = parser.parse_args()
utils = GoUtils(args)

t = utils.get_framework_template()

if args.deploy:
    utils.deploy_template(args.stack, t, utils.config['Tags'])
