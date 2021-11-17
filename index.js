const fs = require('fs');
const _ = require('lodash');

//Reading the file 
var input = fs.readFileSync('input.csv', {encoding: 'utf8'})

//Variables for all parts of the .csv file.
var table = _.split(input, '\n').slice(1);
var header = _.split(_.split(input,'\n').slice(0,1), ",");
var columns = [];

//Remove all empty rows on the .csv file
_.remove(table,function(n){
    return n == "";
})

// var "columns" receives every column value for all rows.
_.forEach(table, function (row){
    columns.push(_.split(row, ','))
})

var json_keys = [];
_.forEach(header, function(column){
    if(_.indexOf(column, " ") !== -1){
        var tags = []
        while(_.indexOf(column, " ") !== -1){
            tags.push( _.slice(column, _.lastIndexOf(column, " ")+1) )
            column = column.substring(0,_.lastIndexOf(column, " "))
            _.replace(tags, '"', '');
            
            console.log(tags);
        }
    }else if(_.indexOf(json_keys, column)=== -1){
        json_keys.push(column);
    } 
})

// console.log(json_keys);
// console.log(columns[0][0]);
// console.log(header);