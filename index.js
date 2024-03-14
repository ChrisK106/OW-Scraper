import express from 'express';
import axios from 'axios';
import * as cheerio from 'cheerio';
import cors from 'cors'

const app = express()
const port = process.env.PORT || 8000;
const domainUrl = 'https://site.q10.com'
const loginUrl = domainUrl + '/User/Login?returnUrl=%2F'
const loginUser = 'chris.ae.cgca@gmail.com'
const loginPassword = 'SMjutz215'

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
        NombreUsuario: loginUser,
        Contrasena: loginPassword
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

app.get('/listar-videos', (req, res) => {
    
    let html, $
    
    // OW AplentId
    let aplentId = '3d708335-480c-41dc-b2cc-07d79f3b4eab'
    // OW UserId
    let userId = '81232'
    // OW Username
    let username = 'p.castillo.f%40orsonwelles.edu.pe'
    // OW PersonaId
    let personaId = '112619872678'
    
    let authUrl = domainUrl + '/AutenticarUsuario?roleId=0&aplent=' + aplentId + '&codigoUsuario=' + userId + '&userName=' + username + '&recordarme=False&codigoPersona=' + personaId

    const axiosInstance = axios.create({
        withCredentials: true,
        headers: {
            "Content-type": "application/x-www-form-urlencoded; charset=UTF-8",
        },
    })
    
    axiosInstance.post(authUrl)
    .then(async response => {
        axiosInstance.interceptors.request.use(config => {
            config.headers['Cookie'] = response.headers['set-cookie'];
            return config;
        })

        let data = []
        let recordedClassesListUrl = domainUrl + '/AulasVirtuales/ClasesGrabadas/Lista?pagina='

        //get page range from query params or default to 1-20
        let pageFrom = req.query.from || 1
        let pageTo = req.query.to || 20
        //check if hasSubjectId flag is set to true or default to false
        let hasSubjectIdFlag = req.query.hasSubjectId === 'true'

        console.log('Página desde: ' + pageFrom + ' hasta: ' + pageTo)
        
        for (let i = pageFrom; i <= pageTo; i++) {
            await axiosInstance.get(recordedClassesListUrl + i)
            .then(async response => {
                
                //load response
                html = response.data
                $ = cheerio.load(html)

                //check if there are no results
                if($('.no-results').text().trim() === 'No hay registros') return

                //get all recorded classes in current page
                let recs = $('body > div > div > div.table-responsive > table > tbody > tr')
                
                let date, subjectId, subjectName, teacher, roomId
                
                //iterate over recorded classes (up to 12 per page)
                for (let rec of recs) {

                    console.log('Página ' + i + ' - Rec ' + (recs.index(rec) + 1) + ' de ' + recs.length)

                    date = $('td:eq(0)', $(rec)).text().trim()
                    subjectId = $('td:eq(1)', $(rec)).text().trim()
                    subjectName = $('td:eq(2)', $(rec)).text().trim()
                    teacher = $('td:eq(3)', $(rec)).text().trim()
                    roomId = $('td:eq(4)', $(rec)).text().trim()
                    
                    //check if subjectId is empty and hasSubjectIdFlag is true to skip current class
                    if (hasSubjectIdFlag && subjectId === '') continue

                    let videos = []

                    //check if class has video recordings
                    if ($('td:eq(5)', $(rec)).text().trim() !== 'La clase virtual no se llevó a cabo') {

                        //get video recordings of current class
                        let vids = $('body > div > div > div.table-responsive > table > tbody > tr:nth-child(' + (recs.index(rec) + 1) + ') > td:nth-child(6) > table > tbody > tr')

                        let info, audit, url, downloadUrl

                        //iterate over video recordings
                        for (let vid of vids) {
                            info = $(vid).find('span').attr('title')
                            audit = $(vid).find('i').attr('title')
                            url = $(vid).find('a').attr('data-relative')

                            if (url !== undefined) {
                                await axiosInstance.get(domainUrl + '/Archivo/AzureStorage/GetFileUrl?url=' + url)
                                .then(response => {
                                    downloadUrl = response.data
                                })
                            }
                            videos.push({ info, audit, url, downloadUrl })
                        }
                    }

                    //check if videos array is not empty to push it to data array
                    if (videos.length > 0) {
                        data.push({ date, subjectId, subjectName, teacher, roomId, videos })
                    }
                }
            })
        }
        res.json(data)
    })
    .catch( error => { console.log(error) })
})

app.listen(port, () => {
    console.log(`Server listening on port ${port}`)
})
