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
(tasklist, tasklist_err) = p.communicate()

p = subprocess.Popen(['QUERY', 'USER'], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
(idle, idle_err) = p.communicate()

item['user'] = os.environ['USERDOMAIN'] + '\\' + os.environ['USERNAME']
item['time'] = calendar.timegm(now.utctimetuple())
item['tasklist'] = tasklist + '\r\n'
item['tasklist_err'] = tasklist_err + '\r\n'
item['idle'] = idle + '\r\n'
item['idle_err'] = idle_err + '\r\n'

#print(json.dumps(item))
table.put_item(Item=item)
