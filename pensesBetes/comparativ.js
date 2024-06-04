const tableau = "[1000208,1000208,1000795,1000794,1000798,1000794]";

const defTableau = JSON.parse(tableau);

for (let i = 0; i < defTableau.length; i++) {
    for (let j = i + 1; j < defTableau.length; j++) {
        if (defTableau[i] !== defTableau[j]) {
            console.log("Le numéro " + defTableau[i] + " est différent de " + defTableau[j]);
        } else {
            console.log("Le numéro " + defTableau[i] + " est égal à " + defTableau[j]);
        }
    }
}
