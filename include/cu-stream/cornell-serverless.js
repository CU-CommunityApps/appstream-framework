// Cornell Serverless Client

/*global AWS*/
/*global apigClientFactory*/

function CornellServerless() {
    var self = this;
    
    self.shire = window.localStorage.getItem('shire');
    self.aws_account = window.localStorage.getItem('aws_account');
    self.aws_region = window.localStorage.getItem('aws_region');
    self.iam_idp = window.localStorage.getItem('iam_idp');
    self.api_domain = window.localStorage.getItem('api_domain');
    self.static_domain = window.localStorage.getItem('static_domain');
    self.app_environment = window.localStorage.getItem('app_environment');
    self.admin_creds  = JSON.parse(window.localStorage.getItem('cornell_sts_admin_credentials'));
}

CornellServerless.prototype = {
   
    init_sts_credentials: function() {
        var self = this;
       
        if (!self.admin_creds) {
            window.location.href = '/login';
            return;
        }
            
        var creds = self.admin_creds.Credentials;
        var now = Date.now();
        var expires = Date.parse(creds.Expiration);
        
        if (now >= expires) {
            self.admin_creds = null;
            window.localStorage.removeItem('cornell_sts_admin_credentials');
            window.location.href = '/login';
            return;
        }
        
        /*
        AWS.config.update({
            credentials: new AWS.Credentials(
                creds.AccessKeyId, creds.SecretAccessKey, creds.SessionToken,
            ),
            region: self.admin_creds.region,
        });
        */
    },
   
    get_sts_credentials: function(saml_response, callback) {
       var self = this;
       var sts = new AWS.STS();
       
       var sts_params = {
            RoleArn: 'arn:aws:iam::{Account}:role/{Role}'.unicorn({
                Account: self.aws_account,
                Role: 'shib-stream_api_admin_{Environment}'.unicorn({
                    Environment: self.app_environment,
                }),
            }),
            
            PrincipalArn: self.iam_idp,
            SAMLAssertion: saml_response,
       };
       
       sts.assumeRoleWithSAML(sts_params, function(err, response) {
           if (err) {
               console.error('Bad SAML Login');
               console.log(err);
               callback(false);
               return;
           }
           
           console.log('Successful SAML Login');
           window.localStorage.setItem('cornell_sts_admin_credentials', JSON.stringify(response));
           callback(true);
       });
   },
    
};

String.prototype.unicorn = String.prototype.unicorn || function () {
    "use strict";
    var str = this.toString();
    if (arguments.length) {
        var t = typeof arguments[0];
        var key;
        var args = ("string" === t || "number" === t) ?
            Array.prototype.slice.call(arguments)
            : arguments[0];
        for (key in args) {
            str = str.replace(new RegExp("\\{" + key + "\\}", "gi"), args[key]);
        }
    }
    return str;
};
