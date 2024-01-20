import express, { response } from 'express';
import axios from 'axios';
import * as cheerio from 'cheerio';
import cors from 'cors'

const app = express()
const port = process.env.PORT || 8000;
const domainUrl = 'https://site.q10.com'
const loginUrl = domainUrl + '/User/Login?returnUrl=%2F'

app.use(express.static('public'))

app.use(cors({
    credentials: true
}))

app.get('/', (req, res) => {
    res.send('OW Scraper running! :)')
})

app.get('/notasxperiodo', (req, res) => {
    res.redirect('/notasxperiodo.html')
})

app.get('/notas/:matriculaId/periodo/:periodoId', (req, res) => {

    let html, $
    let subdomainsUrl, institutionUrl, roleUrl, authUrl
    let aplentId

    const axiosInstance = axios.create({
        withCredentials: true,
        headers: {
            "Content-type": "application/x-www-form-urlencoded; charset=UTF-8",
        },
    })
    
    axiosInstance.post(loginUrl, {
        NombreUsuario: 'chris.ae.cgca@gmail.com',
        Contrasena: 'SMjutz215'
        })
    .then(response => {
        html = response.data
        $ = cheerio.load(html)
        subdomainsUrl = domainUrl + $('#form-subdomains').attr('action')
        aplentId = new URL(subdomainsUrl).searchParams.get('aplentId')
        console.log(subdomainsUrl)

        axiosInstance.post(subdomainsUrl)
        .then(response => {
            html = response.data
            $ = cheerio.load(html)
            institutionUrl = domainUrl + $('#institution-selection').attr('action')
            console.log(institutionUrl)
            
            axiosInstance.post(institutionUrl, {aplentId: aplentId})
            .then(response => {
                html = response.data
                $ = cheerio.load(html)
                roleUrl = domainUrl + $('#role-selection').attr('action') + '&roleId=1'
                console.log(roleUrl)

                axiosInstance.post(roleUrl)
                .then(response => {

                    html = response.data
                    $ = cheerio.load(html)
                    authUrl = domainUrl + $('#dobleFactor').attr('action')
                    console.log(authUrl)

                    axiosInstance.post(authUrl)
                    .then(response => {

                        axiosInstance.interceptors.request.use(config => {
                            config.headers['Cookie'] = response.headers['set-cookie'];
                            return config;
                        })

                        let matriculaId = req.params['matriculaId']
                        let periodoId = req.params['periodoId']
                        let notasUrl = domainUrl + '/Resultados/Lista?matriculaPrograma=' + matriculaId + '&periodo=' + periodoId + '&tipoEvaluacion=1'
                        
                        console.log(notasUrl)

                        axiosInstance.get(notasUrl)
                        .then(response => {
                            html = response.data
                            $ = cheerio.load(html)

                            let data = []
                            let promedioPeriodo = $('.cardPromedio').find('h2').text().trim()

                            data.push(promedioPeriodo)

                            $('.asignatura').each(function(asignaturaIndex = 0) {

                                let cursos = []
                                let header = $('.header', $(this)).text().trim()
                                //const url = $(this).find('h2').attr('href')

                                $('.table-responsive', $(this)).each(function(tableIndex = 0) {
                                    
                                    let capacidades = []
                                    let nombreCurso, docenteCurso, periodoCurso, estadoCurso, inasistencia, notaFinal
            
                                    nombreCurso = $('h4.title-asig', $(this)).text().trim()
                                    docenteCurso = $('p:eq(0)', $(this)).text().trim().substring(9)
                                    periodoCurso = $('p:eq(1)', $(this)).text().trim().substring(10)
                                    estadoCurso = $('p:eq(2)', $(this)).text().trim().substring(8)

                                    inasistencia = $('div:eq(3)', '.asignatura:eq(' + asignaturaIndex + ') .table-responsive:eq(' + tableIndex + ') + div').text().trim()
                                    notaFinal = $('div:eq(6)', '.asignatura:eq(' + asignaturaIndex + ') .table-responsive:eq(' + tableIndex + ') + div').text().trim()

                                    let trIndex = 1

                                    $('tbody tr:even', $(this)).each(function() {

                                        let descripcionCapacidad, notaCapacidad

                                        descripcionCapacidad = $("[rowspan=1]", $(this)).text().trim().substring(12)
                                        notaCapacidad = $('tbody tr:eq(' + trIndex + ') .nota-capacidad:eq(1)', '.asignatura:eq(' + asignaturaIndex + ') .table-responsive:eq(' + tableIndex + ')').text().trim()
                                        
                                        capacidades.push({
                                            descripcionCapacidad, notaCapacidad
                                        })

                                        trIndex = trIndex+2;
                                    })

                                    //console.log(capacidades)
            
                                    cursos.push({
                                        nombreCurso, docenteCurso, periodoCurso, estadoCurso, inasistencia, notaFinal, capacidades
                                    })

                                    //tableIndex++
                                })

                                //console.log(cursos)

                                data.push({
                                    header, cursos
                                })

                                //asignaturaIndex++
                            })

                            console.log(data)
                            res.json(data)
                        })
                    })
                })
            })
        })
    })
    .catch( error => { console.log(error) })
})

app.listen(port, () => {
    console.log(`Server listening on port ${port}`)
})
