// conversion to and from MARC and its JSON representation
// NOTE: assumes a space after the field name, and fields newline-separated

exports.jsonToMarc = function(json) {
  var marc = [json.leader];
  
  for (var name in json.fields) {
    if (!json.fields.hasOwnProperty(field)) continue;
    
    var field = name + ' ';
    var value = json.fields[name];
    
    if (typeof value === 'string') {
      field += value;
    } else if (typeof value === 'object') {
      field += value.ind1 + value.ind2;
      
      for (var subfield in value) {
        if (!value.hasOwnProperty(subfield)) continue;
        field += '$' + subfield + value[subfield];
      }
    }
    
    marc.push(field);
  }
  
  return marc.join('\n');
};

exports.marcToJson = function(marc) {
  marc = marc.split('\n');
  
  var leader = marc[0];
  marc = marc.slice(1);
  
  var fields = [];
  for (var marcField of marc) {
    var field = {
      name: marcField.slice(0, 3),
      ind1: marcField[4],
      ind2: marcField[5],
      subfields: []
    };
    
    var subfields = marcField.slice(6);
    var subfieldRegex = /\$(.)([^\$]*)/g;
    var groups;
    while ((groups = subfieldRegex.exec(subfields)) !== null) {
      field.subfields.push({
        [groups[0]]: groups[1]
      });
    }
    
    fields.push(field);
  }
  
  return {leader: leader, fields: fields};
};