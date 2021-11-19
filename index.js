const fs = require('fs');
const _ = require('lodash');
const PNF = require('google-libphonenumber').PhoneNumberFormat;
const phoneUtil = require('google-libphonenumber').PhoneNumberUtil.getInstance();


// Variable with file path.
const file_input = 'input1.csv';

//Reading the file 
let input = fs.readFileSync(file_input, {encoding: 'utf8'})

// variables for all parts of the .csv file
let table = _.split(input, '\n').slice(1);
const header = _.split(_.split(input,'\n').slice(0,1), ",");
let columns = [];

//Remove all empty rows on the .csv file
_.remove(table,function(n){
    return n == "";
})

// let "columns" receives every column value for all rows,
// also removes commas and quotation marks in group column that were causin bugs
_.forEach(table, function (row){
    row = _.replace(row, /\".*?\"/g, function (aux){
        aux = _.replace(aux, ',', '/').replace( '"', '').replace('"', '');
        return aux;
    })
    columns.push(_.split(row, ','))
})

//Object Person with constructors
const Person = {
    fullname: '',
    eid: '',
    groups: [],
    addresses: [],
    invisible: false,
    see_all: false
}

//Object Address with constructors
const Address = {
    type : '',
    tags : [],
    address : ''
}

// Creates a variable that identify the  keys that will be used in the .json file,
// identifies all tags on columns with space in their names
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

// Variable thats going to be printed out in output.json
let people = [];

// Main part of the code
//
// For every row in the csv, it iterates through all columns, then based on header name
// does a specific treatment of the data.
_.forEach(columns, function(data){
    let i=0;

    let groups = [];
    let addresses = [];
    let new_person = _.create(Person);

    //Get the index from the eid column, if in any case it isn't on the 2nd column or index 1.
    const eid_index = _.indexOf(json, 'eid');

    // returns a person with the current row 'eid' if it already exists, else returns undefined.
    const duplicated_person = verifyIdExists(data[eid_index]);
    
    _.forEach(header, function(header_name){
        if(header_name == "group"){
            groups.push(data[i])
        }else if (header_name != json[i]){
            let columns = _.split(data[i], "/");
            _.forEach(columns, function (column_data){
                addresses.push(parseAddress(header_name,column_data,i));
            })
        }else if(header_name == json[i]){
            
            // Adapts yes/no, 1/0 to true and false
            if(data[i] == false || data[i] == "no"){
                data[i] = false;
            }
            if(data[i] == true || data[i] == "yes"){
                data[i] = true;
            }

            // Only creates the key/value in the object Person if it doesn't exists already.
            if(duplicated_person == undefined){
                new_person[header_name] = data[i]
            }
        }
        i++;
    })

    // Removes groups or addresses that return empty.
    _.remove(groups,function(group){
        return group == '';
    });
    _.remove(addresses,function(address){
            return address == undefined;
    })


    // If the person is duplicated, it will only add addresses and groups that aren't already in the addresses/groups array.
    if(duplicated_person != undefined){
        _.forEach(parseGroups(groups), function(gp){
            if(_.indexOf(duplicated_person['groups'], gp) === -1){
                duplicated_person['groups'].push(gp);
            } 
        })
        _.forEach(addresses, function(ad){
            if(_.indexOf(duplicated_person['addresses'], ad) === -1){
                duplicated_person['addresses'].push(ad);
            } 
        })
        //console.log(duplicated_person);
    }else{
        new_person['groups'] = parseGroups(groups);
        new_person['addresses'] = addresses;
        people.push(new_person);
    }
})

// Verifies if a person with the received eid already exists
function verifyIdExists (eid){
    let pers = _.find(people, function (person){return person.eid == eid})
    if( pers != undefined){
        return pers;
    }
    return undefined;
}

//console.log(people);

let dictstring = JSON.stringify(people);

fs.writeFile("output.json", dictstring,function(err, result) {
    if(err) console.log('error', err);
});


// Decides based on column name(includes 'email' or 'phone') which parse function should be executed with the received address.
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

// Formats and validates phone, returning false only if unable to do so.
function formatAndValidatePhone(phone){
    phone = _.replace(phone,/[^a-z0-9]/gi, "");
    try {
        const number = phoneUtil.parse(phone, 'BR');
        return validatePhone(number) ? `${number.values_['1']}${number.values_['2']}`: false;
    } catch (error) {
        return false;
    }
}

// Validates number according to Brazil's phone number format.
function validatePhone(phone){
    return phoneUtil.isValidNumber(phone, "BR");
}

// Returns the array with fixed groups;
function parseGroups(groups) {
    let new_groups = [];
    _.forEach(groups, function(group){
        let new_group = _.split(group, "/");
        _.forEach(new_group, function(aux){
            aux = _.trim(aux);
            new_groups = _.concat(new_groups, aux);
        })
    });
    //console.log("new_groups:", new_groups);

    return new_groups;
}


//console.log(People);
//console.log(json);
//console.log(header);
//console.log(columns);
//console.log(header);