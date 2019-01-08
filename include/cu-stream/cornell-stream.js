// Cornell Serverless Client

/*global $*/
/*global AWS*/
/*global CornellServerless*/
/*global apigClientFactory*/

var cu_serverless = new CornellServerless();
cu_serverless.init_sts_credentials();

function CornellStream() {
    var self = this;
    var admin_creds = cu_serverless.admin_creds.Credentials;
    
    self.admin_client = apigClientFactory.newClient({
        accessKey: admin_creds.AccessKeyId,
        secretKey: admin_creds.SecretAccessKey,
        sessionToken: admin_creds.SessionToken,
        region: cu_serverless.aws_region,
    });
    
}

CornellStream.prototype = {
    
    deployments: { },
    
    init_deployments_page: function(deployment_updates={ }, callback=function(x) {}) {
        var self = this;
        var unit_select = document.getElementById('cu-stream-unit-select');
        var default_option = document.createElement('option');
        default_option.setAttribute('value', ' ');
        default_option.setAttribute('selected', '');
        default_option.setAttribute('disabled', '');
        default_option.setAttribute('hidden', '');
        default_option.appendChild(document.createTextNode('Select a Unit to view its Deployments...'));
        
        self.list_units(function(response) {
            if (!response)
                return; // TODO
        
            while (unit_select.lastChild)
                unit_select.removeChild(unit_select.lastChild);
            
            self.units = response.data.Units;
            unit_select.appendChild(default_option);
            
            for (var i in self.units) {
                var unit = self.units[i].entry_info;
                var unit_option = document.createElement('option');
                unit_option.appendChild(document.createTextNode(unit['UnitName']));
                unit_select.appendChild(unit_option);
            }
        });
    },
    
    list_deployments: function(unit_name, deployment_updates={ }, callback=function(x) { }) {
        console.log(unit_name);
    },
    
    networks: { },
    
    init_networks_page: function(network_updates={ }, callback=function(x) { }) {
        var self = this;
        var network_select = document.getElementById('cu-stream-network-select');
        var default_option = document.createElement('option');
        
        default_option.setAttribute('value', ' ');
        default_option.setAttribute('selected', '');
        default_option.setAttribute('disabled', '');
        default_option.setAttribute('hidden', '');
        default_option.appendChild(document.createTextNode('Select a Network Configuration to view / edit...'));
        
        console.log('Requesting ListNetworks');
        
        self.list_network_configs(function(response) {
            if (!response)
                return; // TODO
            
            console.log('Response ListNetworks');
            
            while (network_select.lastChild)
                network_select.removeChild(network_select.lastChild);
            
            network_select.appendChild(default_option);
            
            for (var i in self.networks) {
                var network = self.networks[i].entry_info;
                var network_option = document.createElement('option');
                network_option.appendChild(document.createTextNode(network['NetworkConfigName']));
                network_select.appendChild(network_option);
            }
            
            callback(true);
            
        }, network_updates);
    },
    
    list_network_configs: function(callback, post_body={ }, headers={ }) {
        var self = this;
       
        self.admin_client.adminNetworksPost(headers, post_body).then(function(response) {
            self.networks = response.data.NetworkConfigs;
            callback(response);
        }).catch(function(err) {
           console.error(err); // TODO
           callback(false);
        });
    },
    
    edit_network: function(network_name) {
        var self = this;
        var network = this.networks[network_name].entry_info;
        var network_form_inputs = $('#cu-stream-network-form input')
        
        for (var i in network_form_inputs) 
            network_form_inputs[i].value = network[network_form_inputs[i].name];
        
        $('#cu-stream-network-name').focus();
    },
    
    update_network_config: function() {
        var self = this;
        var network_form_array = $('#cu-stream-network-form').serializeArray();
        var network_update_info = { };
        
        for (var i in network_form_array) {
            var iName = network_form_array[i]['name'];
            var iValue = network_form_array[i]['value'];
            network_update_info[iName] = iValue;
        }
        
        console.log('Attempting Update Network');
        
        self.init_networks_page({ Updates: [network_update_info] }, function(e) {
            self.clear_networks_page_form();
        });
    },
    
    clear_networks_page_form: function() {
        var network_form_inputs = $('#cu-stream-network-form input')
        
        for (var i in network_form_inputs)
            network_form_inputs[i].value = '';
    },
    
    units: { },
    
    init_units_page: function(unit_updates={ }, callback=function(x) { }) {
        var self = this;
        
        self.list_units(function(response) {
            if (!response)
                return; // TODO
                
            var tbody = document.getElementById('cu-stream-unit-table-body');
            
            var unit_rows = [];
            
            for (var i in self.units) {
                var unit = self.units[i].entry_info;
                var unit_row = document.createElement('tr');
                unit_row.setAttribute('id', 'cornell-stream-unit-row-' + unit['UnitName']);
                
                var unit_name = document.createElement('td');
                unit_name.setAttribute('id', 'cornell-stream-unit-name-' + unit['UnitName']);
                unit_name.appendChild(document.createTextNode(unit['UnitName']));
                unit_row.appendChild(unit_name);
                
                var unit_email = document.createElement('td');
                unit_email.setAttribute('id', 'cornell-stream-unit-email-' + unit['UnitName']);
                unit_email.appendChild(document.createTextNode(unit['UnitEmail']));
                unit_row.appendChild(unit_email);
                
                var unit_kfs = document.createElement('td');
                unit_kfs.setAttribute('id', 'cornell-stream-unit-kfs-' + unit['UnitName']);
                unit_kfs.appendChild(document.createTextNode(unit['UnitKfs']));
                unit_row.appendChild(unit_kfs);
                
                var unit_edit = document.createElement('td');
                var unit_edit_button = document.createElement('button');
                unit_edit_button.setAttribute('title', 'Edit Unit ' + unit['UnitName']);
                unit_edit_button.setAttribute('type', 'button');
                unit_edit_button.setAttribute('name', unit['UnitName']);
                unit_edit_button.setAttribute('onclick', 'cu_stream.edit_unit(this);');
                unit_edit_button.appendChild(document.createTextNode('Edit'));
                unit_edit.appendChild(unit_edit_button);
                unit_row.appendChild(unit_edit);
                
                var unit_delete = document.createElement('td');
                var unit_delete_button = document.createElement('button');
                unit_delete_button.setAttribute('title', 'Delete Unit ' + unit['UnitName']);
                unit_delete_button.setAttribute('type', 'button');
                unit_delete_button.setAttribute('name', unit['UnitName']);
                unit_delete_button.setAttribute('onclick', 'cu_stream.delete_unit(this);');
                unit_delete_button.appendChild(document.createTextNode('Delete'));
                unit_delete.appendChild(unit_delete_button);
                unit_row.appendChild(unit_delete);
                
                unit_rows.push(unit_row);
            }
            
            while (tbody.lastChild) 
                tbody.removeChild(tbody.lastChild);
            
            for (var i in unit_rows) {
                unit_row = unit_rows[i];
                tbody.appendChild(unit_row);
            }
            
            callback(true);
        }, unit_updates);
    },
    
    clear_units_page_form: function() {
        var input_unit_name = document.getElementById('cu-stream-unit-name');
        var input_unit_email = document.getElementById('cu-stream-unit-email');
        var input_unit_kfs = document.getElementById('cu-stream-unit-kfs');
        
        input_unit_name.value = '';
        input_unit_email.value = '';
        input_unit_kfs.value = '';
    },
    
    list_units: function(callback, post_body={ }, headers={ }) {
        var self = this;
       
        self.admin_client.adminUnitsPost(headers, post_body).then(function(response) {
            self.units = response.data.Units;
            callback(response);
        }).catch(function(err) {
           console.error(err); // TODO
           callback(false);
        });
    },
      
    delete_unit: function(unit_button) {
        var self = this;
        var unit_name = unit_button.name;
        
        self.init_units_page({ Deletions: [unit_name] }, function(e) {
            self.clear_units_page_form();
        });
    },
       
    edit_unit: function(unit_button) {
        var unit_name = unit_button.name;
        var unit_email = document.getElementById('cornell-stream-unit-email-' + unit_name).innerHTML;
        var unit_kfs = document.getElementById('cornell-stream-unit-kfs-' + unit_name).innerHTML;
        
        var input_unit_name = document.getElementById('cu-stream-unit-name');
        var input_unit_email = document.getElementById('cu-stream-unit-email');
        var input_unit_kfs = document.getElementById('cu-stream-unit-kfs');
        
        input_unit_name.value = unit_name;
        input_unit_email.value = unit_email;
        input_unit_kfs.value = unit_kfs;
        input_unit_name.focus();
    },
       
    update_unit: function() {
        var self = this;
        var unit_name = document.getElementById('cu-stream-unit-name').value;
        var unit_email = document.getElementById('cu-stream-unit-email').value;
        var unit_kfs = document.getElementById('cu-stream-unit-email').value;
        
        var unit_update_info = {
            UnitName: unit_name.value,
            UnitEmail: unit_email.value,
            UnitKfs: unit_kfs.value,
        };
        
        self.init_units_page({ Updates: [unit_update_info] }, function(e) {
            self.clear_units_page_form();
        });
    },
    
};