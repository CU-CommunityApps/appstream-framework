from __future__ import print_function
import calendar
import os
import json
import subprocess
from boto3.session import Session
from datetime import datetime, timedelta
from time import time

session = Session(region_name='us-east-1')

ddb = session.resource('dynamodb')
table = ddb.Table('appstream-app-metrics')

now = datetime.utcnow()
item = { }

p = subprocess.Popen(['TASKLIST'], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
(out, err) = p.communicate()

item['user'] = os.environ['USERDOMAIN'] + '\\' + os.environ['USERNAME']
item['time'] = calendar.timegm(now.utctimetuple())
item['tasklist'] = out

#print(json.dumps(item))
table.put_item(Item=item)
