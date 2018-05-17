from __future__ import print_function

import logging
import json
from boto3.session import Session
from botocore.exceptions import ClientError
from os import environ
from urlparse import parse_qs, urlparse
from xml.sax.saxutils import quoteattr

logger = logging.getLogger()
logger.setLevel(logging.INFO)

class CredentialException(Exception):
    pass

def response(statusCode, contentType, body):
    resp = {
        'statusCode': statusCode, 
        'headers': { 
            'Content-Type': contentType, 
            'Cache-Control': 'no-cache, no-store, must-revalidate',
        }, 
        'body': body,
    }

    return resp

def redirect(shib):
    logger.info('Redirect') # TODO

    with open('./templates/redirect.html', 'r') as redirectTemplate:
        redirectContent = redirectTemplate.read().format(
            Redirect=quoteattr(shib['TargetRedirect']), 
            Credentials=quoteattr(json.dumps(shib['Credentials'])), 
            Error=quoteattr(json.dumps(shib['Errors'])),
        )

    with open('./templates/base.html', 'r') as baseTemplate:
        redirectBody = baseTemplate.read().format(Content=redirectContent)

    return response('200', 'text/html', redirectBody)

def generate_error(statusCode, errorMessage=''):
    logger.warning('Client or Server Error: ' + errorMessage) #TODO  

    with open('./templates/error.html', 'r') as errorTemplate:
        errorBody = errorTemplate.read().format(Error=errorMessage)

    with open('./templates/base.html', 'r') as baseTemplate:
        htmlBody = baseTemplate.read().format(Content=errorBody)

    return response(statusCode, 'text/html', htmlBody)

def server_error(e):
    logger.critical(e) #TODO
    logging.exception('Critical Error:')
    return generate_error('500', 'AWS_LOGIN_SERVER_ERROR')

def parse_shib_response(body):
    body = parse_qs(body)
    uri = urlparse(body['RelayState'][0])
    targetOrigin = '{Scheme}://{NetLoc}'.format(Scheme=uri.scheme, NetLoc=uri.netloc) 
    targetPath = targetOrigin + uri.path
    params = dict(item.split("=") for item in uri.params.split(";"))

    shib = { 
        'SAMLResponse': body['SAMLResponse'][0],
        'TargetUri': uri,
        'TargetOrigin': targetOrigin,
        'TargetPath': targetPath,
        'TargetRedirect': targetPath,
        'TargetAccount': params['account'],
        'TargetRole': params['role'],
        'Credentials': { },
        'Errors': [],
    } 

    if len(uri.query) > 0:
        shib['TargetRedirect'] += '?' + uri.query

    if len(uri.fragment) > 0:
        shib['TargetRedirect'] += '#' + uri.fragment

    return shib

def get_user_credentials(shib):
    aws = Session(region_name=environ['AWS_REGION'])
    ddb = aws.resource('dynamodb')    
    sts = aws.client('sts')

    # Get URL Role Trusts
    trustTableName = '{App}StageTrustTable{Stage}'.format(App=environ['APP_NAME'], Stage=environ['STAGE_NAME'])
    trustTable = ddb.Table(trustTableName)
    resp = trustTable.get_item(Key={ 'url': shib['TargetPath'] })

    if not 'Item' in resp.keys():
        raise CredentialException('TARGET_URL_UNVERIFIED') # TODO

    # Verify URL Role Trust
    targetRoleArn = 'arn:aws:iam::{TargetAccount}:role/{TargetRole}'.format(TargetAccount=shib['TargetAccount'], TargetRole=shib['TargetRole'])
    trustTableRoles = resp['Item']['target_roles']

    if targetRoleArn not in trustTableRoles:
        raise CredentialException('TARGET_ROLE_UNVERIFIED') # TODO

    # Retrieve Temporary IAM  Credentials
    credentials = sts.assume_role_with_saml(
        PrincipalArn='arn:aws:iam::{TargetAccount}:saml-provider/{IAM_IDP}'.format(TargetAccount=shib['TargetAccount'], IAM_IDP=environ['IAM_IDP']),
        RoleArn=targetRoleArn,
        SAMLAssertion=shib['SAMLResponse'],
    )

    # Remove AWS Response Metadata
    if 'ResponseMetadata' in credentials:
        credentials.pop('ResponseMetadata', None)

    credentials['Credentials']['Expiration'] = credentials['Credentials']['Expiration'].strftime('%c %Z')
    return credentials

def verify_credential_request(event):

    # Ensure POST
    if event['requestContext']['httpMethod'] != 'POST':
        raise CredentialException('NO_IDP_POST') # TODO 

    # Ensure IdP Refered Request
    referer = urlparse(event['headers']['Referer'])
    if referer.netloc != environ['SHIB_IDP']:
        raise CredentialException('WRONG_IDP') # TODO

    # Ensure IdP Included POST Body
    if 'body' not in event or event['body'] == None:
        raise CredentialException('NO_IDP_BODY') # TODO

    # Parse SAML Response
    try: 
        shib = parse_shib_response(event['body'])
    except: 
        raise CredentialException('BAD_TARGET_FORMAT_OR_IDP_BODY') # TODO

    # Attempt to Retrieve Temporary IAM Credentials
    try: 
        shib['Credentials'] = get_user_credentials(shib)

    except CredentialException as e:
        shib['Errors'].append(str(e))

    except ClientError as e:
        if e.response['Error']['Code'] == 'AccessDenied':
            shib['Errors'].append('USER_ACCESS_DENIED')
        else:
            raise e

    return shib

def lambda_handler(event, context):
    try:
        shib = verify_credential_request(event)
        return redirect(shib)

    except CredentialException as e:
        return generate_error('400', str(e)) 

    except Exception as e:
        return server_error(e)

