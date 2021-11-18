const fs = require('fs');
const _ = require('lodash');
const PNF = require('google-libphonenumber').PhoneNumberFormat;
const phoneUtil = require('google-libphonenumber').PhoneNumberUtil.getInstance();

//Reading the file 
let input = fs.readFileSync('input1.csv', {encoding: 'utf8'})

//letiables for all parts of the .csv file.
let table = _.split(input, '\n').slice(1);
const header = _.split(_.split(input,'\n').slice(0,1), ",");
let columns = [];

//Remove all empty rows on the .csv file
_.remove(table,function(n){
    return n == "";
})

// let "columns" receives every column value for all rows,
// also removes commas and quotation marks in group column that were causin bugs.
_.forEach(table, function (row){
    row = _.replace(row, /\".*?\"/g, function (aux){
        aux = _.replace(aux, ',', '/').replace( '"', '').replace('"', '');
        return aux;
    })
    columns.push(_.split(row, ','))
})

//Object Person with constructors
function Person(fullname,eid,addresses,groups,invisible,see_all){
    this.fullname = fullname;
    this.eid = eid;
    this.groups = groups;
    this.addresses = addresses;
    this.invisible = invisible;
    this.see_all = see_all;
}

//Object Address with constructors
function Address(type, tags, address){
    this.type = type;
    this.tags = tags;
    this.address = address;
}

// Creates a variable that identify the json keys that will be used,
// identifies tags on columns with space in their names.

let json = [];
_.forEach(header, function(column){
    if(_.indexOf(column, " ") !== -1){

        column = _.replace(column,'"', '').replace('"', '').split(' ')
        let tags_array = _.slice(column, 1);
        column = {
            type: column[0],
            tags: tags_array
        }
        
        json.push(column);

    }else {
        json.push(column);
    } 
})

let people = [];

_.forEach(columns, function(data){
    let i=0;

    let groups = [];
    let addresses = [];
    Person = {}

    _.forEach(header, function(test){
        if(test == "group"){
            groups.push(data[i])
        }else if (test != json[i]){
            addresses.push(parseAddress(test, data[i],i))
        }else if(test == json[i]){
            Person[test] = data[i]
        }
        i++;
    })
    Person['groups'] = groups;
    Person['addresses'] = addresses;
    //people.push(Person);

    //console.log(Person.addresses);
    //people.push(new Person(data[0],"100",{type: "phone", tags: ["test", "test1"], address: "83274823847"}, ["Turma 1", "Turma 2"], true, true));
    
})

function parseAddress(header_column,data_column,header_column_id){
    let result = {};
    if(_.includes(header_column, "email") == true){
        result = parseEmail(header_column_id,data_column);
    }else if (_.includes(header_column, "phone") == true){
        result = parsePhone(header_column_id,data_column);
    }else{
        return undefined;
    }

    return result;
}

// Creates, fixes and validates the email address with proper tags then 
function parseEmail(header_id,column){
    Address = json[header_id];

    let email = removeInvalidCharacters(column);
    
    if(validateEmail(email)){
        Address['address'] = email;
        return Address;
    }else{
        return undefined;
    }
}

// Removes invalid characters and fix some typos of the email address.
function removeInvalidCharacters(email){
    
    _.replace(email, /(:|\s|#|'|'|\\)*/g, '')
    .replace(/(,|\.\.|>)/g, '.')
    .replace('@@', '@')
    .replace(/[()]/g, '')
    .replace(/[\])}[{(]/g, '')

    return email;
}

//Validates email with RegEx from https://www.emailregex.com/
function validateEmail(email){
    const re= /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
    return re.test(String(email).toLowerCase());
}

function parsePhone(header_id,column){
    Address = json[header_id];
    let phone = column;
    
    if(validatePhone(phone)){
        Address['address'] = phone;
        return Address;
    }else{
        return undefined;
    }
}
function validatePhone(phone){
    console.log("phone:",phone)
    if(phoneUtil.isValidNumber(phone)){
        
        let number = phoneUtil.parseAndKeepRawInput(phone, 'BR');
        console.log("number",number)
        //phoneUtil.isValidNumberForRegion(phoneUtil.parse('202-456-1414', 'US'), 'US');
    }else{
        return false;
    }
    
}
//console.log(People);
//console.log(json);
//console.log(header);
//console.log(columns);
//console.log(header);