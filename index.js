import express from 'express';
import rateLimit from 'express-rate-limit';
import axios from 'axios';
import * as cheerio from 'cheerio';
import cors from 'cors'

// Constants
const port = process.env.PORT || 8000;
const domainUrl = 'https://site.q10.com'
const loginUrl = domainUrl + '/User/Login?returnUrl=%2F'
const loginUser = 'chris.ae.cgca@gmail.com'
const loginPassword = 'SMjutz215'

// Create an Express application
const app = express()

// Setting Express to serve static files from the public folder
app.use(express.static('public'))

// Setting Express to use CORS middleware
app.use(cors({
    credentials: true
}))

// Setting Express to use rate-limiting middleware
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // max 10 requests per windowMs (10 requests per minute)
});

// Apply rate limiter to all requests
app.use(limiter);

// GET request to the root URL 
app.get('/', (req, res) => {
    res.send('OW Scraper running! :)')
})

// GET request to /notasxperiodo
app.get('/notasxperiodo', (req, res) => {
    res.redirect('/notasxperiodo.html')
})

// Function to update the cookies in the axios instance to be used in subsequent requests
function updateCookies(axiosInstance, cookies) {
    axiosInstance.interceptors.request.clear()

    axiosInstance.interceptors.request.use(config => {
        config.headers['Cookie'] = cookies
        return config
    })

    return axiosInstance
}

// Function to login and return the axios instance with the cookies
async function login(axiosInstance) {
    let html, $
    let subdomainsUrl, institutionUrl, roleUrl, authUrl
    let aplentId, inst_t, rol_t, auth_t
    let cookies = []

    try {
        await axiosInstance.post(loginUrl, {
            NombreUsuario: loginUser,
            Contrasena: loginPassword
        })
        .then(async response => {
            html = response.data
            $ = cheerio.load(html)
            subdomainsUrl = domainUrl + $('#form-subdomains').attr('action')
            aplentId = new URL(subdomainsUrl).searchParams.get('aplentId')
            console.log(subdomainsUrl)

            await axiosInstance.post(subdomainsUrl, {
                pass: loginPassword,
                subdomain: '.'
            })
            .then(async response => {
                html = response.data
                $ = cheerio.load(html)
                institutionUrl = domainUrl + $('#institution-selection').attr('action')
                inst_t = $('#institution-selection').find('input[name=inst_t]').attr('value')
                console.log(institutionUrl)
                
                await axiosInstance.post(institutionUrl, {
                    inst_t: inst_t,
                    aplentId: aplentId
                })
                .then(async response => {
                    html = response.data
                    $ = cheerio.load(html)
                    roleUrl = domainUrl + $('#role-selection').attr('action')
                    rol_t = $('#role-selection').find('input[name=rol_t]').attr('value')
                    console.log(roleUrl)

                    await axiosInstance.post(roleUrl, {
                        rol_t: rol_t,
                        roleId: 1
                    })
                    .then(async response => {
                        html = response.data
                        $ = cheerio.load(html)
                        authUrl = domainUrl + $('#dobleFactor').attr('action')
                        auth_t = $('#dobleFactor').find('input[name=ta]').attr('value')
                        console.log(authUrl + '?ta=' + auth_t)

                        await axiosInstance.post(authUrl, {
                            ta: auth_t
                        })
                        .then(response => {
                            cookies = response.headers['set-cookie']
                            axiosInstance = updateCookies(axiosInstance, cookies)
                            console.log('Logged in')
                        })
                    })
                })
            })
        })

        return axiosInstance

    // Catch any errors and log them to the console
    } catch (error) {
        console.error('Login failed:', error.message)
    }
}

// Function to change the role to Super Admin and return the axios instance with the cookies
async function changeRoleToSuperAdmin(axiosInstance) {
    let changeRoleUrl = domainUrl + '/cambiarrol'
    let cookies = []

    await axiosInstance.post(changeRoleUrl, {
        id: 0
    })
    .then(response => {
        cookies = response.headers['set-cookie']
        axiosInstance = updateCookies(axiosInstance, cookies)
        console.log('Role changed to Super Admin')
    })

    return axiosInstance
}

// GET request to /notas/:matriculaId/periodo/:periodoId
// This route scrapes the grades of the student for the specified period
app.get('/notas/:matriculaId/periodo/:periodoId', async (req, res) => {

    let html, $

    // Create an axios instance
    let axiosInstance = axios.create({
        withCredentials: true,
        headers: {
            "Content-type": "application/x-www-form-urlencoded; charset=UTF-8"
        },
    })
    
    // Login to the site and return the axios instance with the cookies
    axiosInstance = await login(axiosInstance)

    // Check if login was successful
    if (!axiosInstance) {
        // If login was not successful, send a JSON response to the client indicating that the login failed
        res.json({ message: 'Login failed' })
        return
    }

    // Get the matriculaId and periodoId from the URL
    let matriculaId = req.params['matriculaId']
    let periodoId = req.params['periodoId']

    // Create the URL to get the grades of the student for the specified period
    let notasUrl = domainUrl + '/Resultados/Lista?matriculaPrograma=' + matriculaId + '&periodo=' + periodoId + '&tipoEvaluacion=1'
    console.log(notasUrl)

    // Get the grades of the student for the specified period and return the data
    await axiosInstance.get(notasUrl)
    .then(response => {
        html = response.data
        $ = cheerio.load(html)

        let data = []
        let promedioPeriodo = $('.cardPromedio').find('h2').text().trim()

        data.push(promedioPeriodo)

        $('.asignatura').each(function(asignaturaIndex = 0) {

            let cursos = []
            let header = $('.header', $(this)).text().trim()

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

// GET request to /listar-videos
// This route scrapes the video recordings of the virtual classes
app.get('/listar-videos', async (req, res) => {
    
    let html, $
    
    // Create an axios instance
    let axiosInstance = axios.create({
        withCredentials: true,
        headers: {
            "Content-type": "application/x-www-form-urlencoded; charset=UTF-8",
        },
    })

    // Login to the site and return the axios instance with the cookies
    axiosInstance = await login(axiosInstance)

    // Check if login was successful
    if (!axiosInstance) {
        // If login was not successful, send a JSON response to the client indicating that the login failed
        res.json({ message: 'Login failed' })
        return
    }

    // Change the role to Super Admin and return the axios instance with the cookies
    axiosInstance = await changeRoleToSuperAdmin(axiosInstance)

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

// Start the server on the specified port
app.listen(port, () => {
    console.log(`Server listening on port ${port}`)
})
