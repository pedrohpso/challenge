const fs = require('fs');
const _ = require('lodash');
const PNF = require('google-libphonenumber').PhoneNumberFormat;
const phoneUtil = require('google-libphonenumber').PhoneNumberUtil.getInstance();

// Variable with file path.
const file_input = 'input.csv';

//Reading the file 
let input = fs.readFileSync(file_input, {encoding: 'utf8'})

// table represents the .csv file divided row by row.
const table = _.split(input, '\n').slice(1);

//Remove all empty rows on the .csv file
_.remove(table,function(n){
    return n == "";
})

// header is an array with all the columns from the header.
const header = _.split(_.split(input,'\n').slice(0,1), ",");

// let "columns" receives every column value for all rows,
// 
let columns = [];
_.forEach(table, function (row){
    row = _.replace(row, /\".*?\"/g, function (aux){
        aux = _.replace(aux, ',', '/').replace( '"', '').replace('"', '');
        return aux;
    })
    columns.push(_.split(row, ','))
});

//Object Person
const Person = {
    fullname: '',
    eid: '',
    groups: [],
    addresses: [],
    invisible: false,
    see_all: false
}

//Object Address
const Address = {
    type : '',
    tags : [],
    address : ''
}

// Creates a variable that identifies the tags and type, from the header columns,
// if there is a space in the name, else if its a column for an address without tags it defines a no tag column as an object. 
// else just makes the element from the array the name of the column.
let json = [];
_.forEach(header, function(column){
    console.log(column);
    if(_.indexOf(column, " ") !== -1){

        column = _.replace(column,'"', '').replace('"', '').split(' ')
        let tags_array = _.slice(column, 1);
        column = {
            type: column[0],
            tags: tags_array
        }
        
        json.push(column);

    }else if(column == "phone" || column == "email"){
        column={
            type: column,
            tags: []
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

    //Get the index from the 'eid' column, if in any case it isn't on the 2nd column or index 1.
    const eid_index = _.indexOf(json, 'eid');

    // returns a person with the current row 'eid' if it already exists in the people array, else returns undefined.
    const duplicated_person = verifyIdExists(data[eid_index]);
    
    // if the header is a group column it adds its content to the group array,
    // if its json counterpart is an object that has tags and type, it is treated as an address.
    // else is just a new key/value in the Person object.
    _.forEach(header, function(header_name){
        if(header_name == "group"){
            groups.push(data[i])
        }else if (header_name != json[i]){
            // if theres more than one address in the same column, it will split then add all of them.
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
    }else{
        new_person['groups'] = parseGroups(groups);
        new_person['addresses'] = addresses;
        people.push(new_person);
    }
})

// Verifies if a person with the received eid already exists in the people array.
function verifyIdExists (eid){
    let pers = _.find(people, function (person){return person.eid == eid})
    if( pers != undefined){
        return pers;
    }
    return undefined;
}

// Code responsible for writing the output.json file.
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

    return result;
}

function parseEmail(header_id,column){
    let add = _.create(Address, json[header_id])

    let email = removeInvalidCharacters(column);
    if(validateEmail(email)){
        add['address'] = email;
        return add;
    }

    return undefined;
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

function parsePhone(header_id,column){
    let add = _.create(Address, json[header_id])
    const phone = formatAndValidatePhone(column);
    
    if(phone){
        add['address'] = phone;
        return add;
    }

    return undefined;
}

// Formats and validates phone address object with proper tags, returning false only if unable to do so.
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
    return new_groups;
}