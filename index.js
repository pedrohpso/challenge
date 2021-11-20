const fs = require('fs');
const _ = require('lodash');
const PNF = require('google-libphonenumber').PhoneNumberFormat;
const phoneUtil = require('google-libphonenumber').PhoneNumberUtil.getInstance();

// Variable with file path.
const file_input = 'input.csv';

//Reading the file 
let input = fs.readFileSync(file_input, { encoding: 'utf8' })

// table represents the .csv file divided row by row.
const table = _.split(input, '\n').slice(1);

//Remove all empty rows on the .csv file
_.remove(table, function (n) {
    return n == "";
})

// header is an array with all the columns from the header.
const header = _.split(_.split(input, '\n').slice(0, 1), ",");

// let "columns" receives every column value for all rows
let columns = [];
_.forEach(table, function (row) {
    row = _.replace(row, /\".*?\"/g, function (aux) {
        aux = _.replace(aux, ',', '/').replace('"', '').replace('"', '');
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
    type: '',
    tags: [],
    address: ''
}

// Variable thats going to be printed out in output.json
let people = [];

let json = [];

headerTypeDefinition();
createPerson();
createOutputJson();

// Creates a variable that identifies the tags and type, from the header columns
// if there is a space in the name, else if its a column for an address without tags it defines a no tag column as an object. 
// else just makes the element from the array the name of the column.
function headerTypeDefinition() {
    _.forEach(header, function (column) {
        if (_.indexOf(column, " ") !== -1) {
            column = defineHeaderWithTags(column);
            json.push(column);
        } else if (column == "phone" || column == "email") {
            column = defineHeaderWithoutTags(column);
            json.push(column);
        } else {
            json.push(column);
        }
    });
}

function defineHeaderWithoutTags(column) {
    column = {
        type: column,
        tags: []
    };
    return column;
}

function defineHeaderWithTags(column) {
    column = _.replace(column, '"', '').replace('"', '').split(' ');
    let tags_array = _.slice(column, 1);
    column = {
        type: column[0],
        tags: tags_array
    };
    return column;
}





// Code responsible for writing the output.json file.
function createOutputJson() {
    let dictstring = JSON.stringify(people);
    fs.writeFile("output.json", dictstring, function (err, result) {
        console.log("output.json criado com sucesso.");
        if (err)
            console.log('error', err);
    });
}

// Main part of the code
// For every row in the .csv, it iterates through all columns, then based on header name
// does a specific treatment of the data.
function createPerson() {
    _.forEach(columns, function (data) {
        let i = 0;
        let groups = [];
        let addresses = [];
        let new_person = _.create(Person);

        //Get the index from the 'eid' column, if in any case it isn't on the 2nd column or index 1.
        const eid_index = _.indexOf(json, 'eid');

        // returns a person with the current row 'eid' if it already exists in the people array, else returns undefined.
        const duplicated_person = verifyIdExists(data[eid_index]);

        headerParse(groups, data, i, addresses, duplicated_person, new_person);
        removeEmptyValues(groups, addresses);

        groups = parseGroups(groups);

        if (duplicated_person != undefined) {
            addDuplicatedPersonData(groups, duplicated_person, 'groups');
            addDuplicatedPersonData(addresses, duplicated_person, 'addresses');

        } else {
            new_person['groups'] = groups;
            new_person['addresses'] = addresses;
            people.push(new_person);
        }
    });
}

// If the person is duplicated, it will only add addresses and groups that aren't already in the addresses/groups array.
function addDuplicatedPersonData(array, duplicated_person, key) {
    _.forEach(array, function (ar) {
        if (_.indexOf(duplicated_person[key], ar) === -1) {
            duplicated_person[key].push(ar);
        }
    });
}

// Removes groups or addresses that return empty.
function removeEmptyValues(groups, addresses) {
    _.remove(groups, function (group) {
        return group == '';
    });
    _.remove(addresses, function (address) {
        return address == undefined;
    });
}

function headerParse(groups, data, i, addresses, duplicated_person, new_person) {
    _.forEach(header, function (header_name) {
        // if the header is a 'group' column it adds its content to the group array,
        if (header_name == "group") {
            groups.push(data[i]);
        } else if (header_name != json[i]) {
            addAddress(data, i, addresses, header_name);

            // if the header name is the same as the header defined type, adds the key/value to the new person object.
        } else if (header_name == json[i]) {
            formatToBoolean(data, i);
            // Only creates the key/value in the object Person if it doesn't exists already.
            if (duplicated_person == undefined) {
                new_person[header_name] = data[i];
            }
        }
        i++;
    });
}

// Treats as an address when its json counterpart is an object with type and tags.
function addAddress(data, i, addresses, header_name) {
    // if theres more than one address in the same column, it will split then add all of them.
    let columns = _.split(data[i], "/");
    _.forEach(columns, function (column_data) {
        addresses.push(parseAddress(header_name, column_data, i));
    });
}

// Adapts yes/no, 1/0 to true and false
function formatToBoolean(data, i) {
    if (data[i] == false || data[i] == "no") {
        data[i] = false;
    }
    if (data[i] == true || data[i] == "yes") {
        data[i] = true;
    }
}

// Verifies if a person with the received eid already exists in the people array.
function verifyIdExists(eid) {
    let pers = _.find(people, function (person) { return person.eid == eid })
    if (pers != undefined) {
        return pers;
    }
    return undefined;
}

// Decides based on column name(includes 'email' or 'phone') which parse function should be executed with the received address.
function parseAddress(header_column, data, header_column_id) {
    let result = {};
    if (_.includes(header_column, "email") == true) {
        result = parseEmail(header_column_id, data);
    } else if (_.includes(header_column, "phone") == true) {
        result = parsePhone(header_column_id, data);
    } else {
        return undefined;
    }

    return result;
}

function parseEmail(header_id, column) {
    let add = _.create(Address, json[header_id])

    let email = removeInvalidCharacters(column);

    if (validateEmail(email)) {
        add['address'] = email;
        return add;
    }

    return undefined;
}

// Removes invalid characters and fix some typos of the email address.
function removeInvalidCharacters(email) {

    email = _.replace(email, /(:|\s|#|'|'|\\)*/g, '')
        .replace(/(,|\.\.|>)/g, '.')
        .replace('@@', '@')
        .replace(/[()]/g, '')
        .replace(/[\])}[{(]/g, '')

    return email;
}

//Validates email with RegEx from https://www.emailregex.com/
function validateEmail(email) {
    const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
    return re.test(String(email).toLowerCase());
}

function parsePhone(header_id, column) {
    let add = _.create(Address, json[header_id])
    const phone = formatAndValidatePhone(column);

    if (phone) {
        add['address'] = phone;
        return add;
    }

    return undefined;
}

// Formats and validates phone address object with proper tags, returning false only if unable to do so.
function formatAndValidatePhone(phone) {
    phone = _.replace(phone, /[^a-z0-9]/gi, "");
    try {
        const number = phoneUtil.parse(phone, 'BR');
        return validatePhone(number) ? `${number.values_['1']}${number.values_['2']}` : false;
    } catch (error) {
        return false;
    }
}

// Validates number according to Brazil's phone number format.
function validatePhone(phone) {
    return phoneUtil.isValidNumber(phone, "BR");
}

// Returns the array with fixed groups;
function parseGroups(groups) {
    let new_groups = [];
    _.forEach(groups, function (group) {
        let new_group = _.split(group, "/");
        _.forEach(new_group, function (aux) {
            aux = _.trim(aux);
            new_groups = _.concat(new_groups, aux);
        })
    });
    return new_groups;
}