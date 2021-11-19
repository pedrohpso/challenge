const fs = require('fs');
const _ = require('lodash');
const PNF = require('google-libphonenumber').PhoneNumberFormat;
const phoneUtil = require('google-libphonenumber').PhoneNumberUtil.getInstance();

//Reading the file 
let input = fs.readFileSync('input.csv', {encoding: 'utf8'})

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

    _.forEach(header, function(header_name){
        if(header_name == "group"){
            groups.push(data[i])
        }else if (header_name != json[i]){
            let columns = _.split(data[i], "/");
            _.forEach(columns, function (column_data){
                addresses.push(parseAddress(header_name,column_data,i));
            })
            // console.log(addresses);
        }else if(header_name == json[i]){
            
            if(data[i] == false || data[i] == "no"){
                data[i] = false;
            }
            if(data[i] == true || data[i] == "yes"){
                data[i] = true;
            }


            //if(_.find(people, function (person){return person.eid == data[i]}) != undefined){
                Person[header_name] = data[i]
            //}
        }
        i++;
    })

    _.remove(groups,function(node){
        return node == '';
    })
    console.log(groups);
    Person['groups'] = groups;

    _.remove(addresses,function(node){
        return node == undefined;
    })

    Person['addresses'] = addresses;
    //console.log(Person)
    people.push(Person);
})

//console.log(people);

// var dictstring = JSON.stringify(people);
// fs.writeFile("output.json", dictstring,function(err, result) {
//     if(err) console.log('error', err);
// });

function parseAddress(header_column,data,header_column_id){
    
    let result = {};
    if(_.includes(header_column, "email") == true){
        result = parseEmail(header_column_id,data);
    }else if (_.includes(header_column, "phone") == true){
        result = parsePhone(header_column_id,data);
    }else{
        return undefined;
    }
    //console.log(result);
    return result;
}

// Creates, fixes and validates the email address with proper tags
function parseEmail(header_id,column){
    let add = _.create(Address, json[header_id])

    let email = removeInvalidCharacters(column);
    //console.log(email);
    if(validateEmail(email)){
        add['address'] = email;
        return add;
    }else{
        return undefined;
    }
}

// Removes invalid characters and fix some typos of the email address.
function removeInvalidCharacters(email){
    
    email =_.replace(email, /(:|\s|#|'|'|\\)*/g, '')
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

// Creates, fixes and validates the email address with proper tags
function parsePhone(header_id,column){
    //console.log(column);
    let add = _.create(Address, json[header_id])
    const phone = formatAndValidatePhone(column);
    
    if(phone){
        add['address'] = phone;
        return add;
    }else{
        return undefined;
    }
}

function formatAndValidatePhone(phone){
    phone = _.replace(phone,/[^a-z0-9]/gi, "");
    try {
        const number = phoneUtil.parse(phone, 'BR');
        return validatePhone(number) ? `${number.values_['1']}${number.values_['2']}`: false;
    } catch (error) {
        return false;
    }
}

function parseGroups(groups) {
    
}

function validatePhone(phone){
    return phoneUtil.isValidNumber(phone, "BR");
}
//console.log(People);
//console.log(json);
//console.log(header);
//console.log(columns);
//console.log(header);