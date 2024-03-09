const variable = "[821068972,821068971]";
const parsedArray = JSON.parse(variable);


console.log("Tableau :", parsedArray);
console.log("Type de tableau :", Array.isArray(parsedArray) ? "Array" : typeof parsedArray);
