const { describe, it, beforeEach } = require("node:test");
const request = require('request')
const assert = require('node:assert');
const { error } = require("node:console");


async function sendRequest(method, route, body, extraHeader = ""){
    const reqParams = {
        method: method,
        url: 'http://localhost:8000' + route,
        headers: {'content-type' : 'application/json', extraHeader },
        body: JSON.stringify(body),
    }
    let resBody;
    request(reqParams, (error, response) => {
        if(error) throw new Error(error)
        resBody = {statusCode: response.statusCode, body: JSON.parse(response.body)}
    })
    await new Promise(resolve => setTimeout(resolve, 100))
    return resBody
}



describe('registration', () => {
    let response;
    let body;
    it('should return missing POST fields', async () =>{
        body ={}
        response = await sendRequest('POST', '/player/register', body);
        assert.equal(response.statusCode, 400)
    });
    it('should return badRequest user already exists', async () =>{
        body ={
            username: 'admin',
            email: 'baloghm.levente@gmail.com',
            password: 'Admin12!',
            confirmPassword: 'Admin12!'
        }
        response = await sendRequest('POST', '/player/register', body);
        assert.deepStrictEqual(response.body, {error: "Email or username already in use!", success: false})
        assert.equal(response.statusCode, 400)
    });
    it('should return successful registration', async () => {
        body ={
            username: 'asdasdasd',
            email: 'cmd@gmail.com',
            password: 'Admin12!',
            confirmPassword: 'Admin12!'
        }
        response = await sendRequest('POST', '/player/register', body);
        assert.notDeepEqual(response.body, {message: "User registered successfully", data: {}})
        assert.equal(response.statusCode, 200)
    })
})