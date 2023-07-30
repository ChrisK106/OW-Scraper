const divResults = document.querySelector('#resultados')
const divJsonResponse = document.querySelector('#json-response')
const fetchURL = 'http://localhost:8000'

function output(inp) {
    divJsonResponse.appendChild(document.createElement('pre')).innerHTML = inp;
}

function syntaxHighlight(json) {
    json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
        var cls = 'number';
        if (/^"/.test(match)) {
            if (/:$/.test(match)) {
                cls = 'key';
            } else {
                cls = 'string';
            }
        } else if (/true|false/.test(match)) {
            cls = 'boolean';
        } else if (/null/.test(match)) {
            cls = 'null';
        }
        return '<span class="' + cls + '">' + match + '</span>';
    });
}

const btnSetDefaultValues = document.querySelector('#btnSetDefaultValues').addEventListener('click', () => {
    document.querySelector('#matriculaId').value = 12267
    document.querySelector('#periodoId').value = 65
})

const btnSubmit = document.querySelector('#btnVerNotasPorPeriodo').addEventListener('click', () => {

    let matriculaId = document.querySelector('#matriculaId').value.trim()
    let periodoId = document.querySelector('#periodoId').value.trim()

    fetch(fetchURL + '/notas/' + matriculaId + '/periodo/' + periodoId)
        .then(response => {return response.json()})
        .then(data => {
            /*
            const promedioPeriodo = '<div><h3>' + data.promedio + '</h3></div>'
            divResults.insertAdjacentHTML('beforeend', promedioPeriodo)

            data.forEach(data => {
                divResults.insertAdjacentHTML('beforeend', asignatura)
            })
            */

            var str = JSON.stringify(data, null, 4);
            output(syntaxHighlight(str));
        })
        .catch(err => console.log(err))
})
