// conversion to and from MARC and its JSON representation
// NOTE: assumes a space after the field name, and fields newline-separated

// left-pad!!1!!11!!1!11!one!!
function leftPad(str, n, char = '0') {
  return char.repeat(Math.max(n - String(str).length, 0)) + str;
}

exports.jsonToMarc = json => {
  let marc = [json.leader];
  
  for (let control of json.fields.control) {
    marc.push(leftPad(control.tag, 3) + ' ' + control.value);
  }
  
  for (let variable of json.fields.variable) {
    let field = leftPad(variable.tag, 3) + ' ' + variable.ind1 + variable.ind2;
    
    for (let subfield of variable.subfields) {
      field += '$' + subfield.tag + subfield.value;
    }
    
    marc.push(field);
  }
  
  return marc.join('\n');
};

exports.marcToJson = marc => {
  marc = marc.split('\n');
  
  let leader = marc[0];
  marc = marc.slice(1);
  
  let controlFields = [];
  let variableFields = [];
  
  for (let field of marc) {
    let tag = parseInt(field.slice(0, 3), 10);
    let rest = field.slice(4);
    
    if (tag < 10) {
      controlFields.push({tag: tag, value: rest});
    } else {
      let [ind1, ind2] = rest.slice(0, 2);
      let subfields = [];
      
      let subfieldStr = rest.slice(2);
      let subfieldRegex = /\$(.)(.[^\$]*)/g;
      let groups;
      while ((groups = subfieldRegex.exec(subfieldStr)) !== null) {
        let [, subTag, subVal] = groups;
        subfields.push({
          tag: subTag,
          value: subVal
        });
      }
      
      variableFields.push({
        tag: tag,
        ind1: ind1,
        ind2: ind2,
        subfields: subfields
      });
    }
  }
  
  return {
    leader: leader,
    fields: {
      control: controlFields,
      variable: variableFields
    }
  };
};