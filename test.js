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
    await new Promise(resolve => setTimeout(resolve, 300))
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
            password: 'Test12!',
            confirmPassword: 'Test12!'
        }
        response = await sendRequest('POST', '/player/register', body);
        assert.deepStrictEqual(response.body, {error: "Email or username already in use!", success: false})
        assert.equal(response.statusCode, 400)
    });
    it('should return successful registration', async () => {
        body ={
            username: 'asdasdasd',
            email: 'cmd@gmail.com',
            password: 'Test12!',
            confirmPassword: 'Test12!'
        }
        response = await sendRequest('POST', '/player/register', body);
        assert.notDeepEqual(response.body, {message: "User registered successfully", data: {}})
        assert.equal(response.statusCode, 200)
    })
});

describe('login', () => {
    let response;
    let body;
    it('should return missing POST fields', async () =>{
        body ={}
        response = await sendRequest('POST', '/player/login', body);
        assert.equal(response.statusCode, 400)
    });
    it('should return user not found', async () =>{
        body ={
            username: 'asdasdasd1',
            password: 'Test12!'
        }
        response = await sendRequest('POST', '/player/login', body);
        assert.deepStrictEqual(response.body, {error: "User not found", success: false})
        assert.equal(response.statusCode, 404)
    });
    it('should return invalid password or username', async () =>{
        body={
            usernme: 'asdasdasd',
            password: 'Test12!'
        }
        response = await sendRequest('POST', '/player/login', body);
        assert.deepStrictEqual(response.body, {error: "Invalid username", success: false})
        assert.equal(response.statusCode, 400);
        body={
            username: 'asdasdasd',
            passwrd: 'Test12!'
        }
        response = await sendRequest('POST', '/player/login', body);
        assert.deepStrictEqual(response.body, {error: "Invalid password", success: false})
        assert.equal(response.statusCode, 400);
    })
    it('should return wrong password', async () =>{
        body={
            username: 'asdasdasd',
            password: 'Test1432322!'
        }
        response = await sendRequest('POST', '/player/login', body);
        assert.deepStrictEqual(response.body, {error: "Invalid password", success: false})
        assert.equal(response.statusCode, 401);
    })
    it('should return successful login', async () =>{
        body={
            username: 'asdasdasd',
            password: 'Test12!'
        }
        response = await sendRequest('POST', '/player/login', body);
        assert.notDeepEqual(response.body, {data: []})
        assert.equal(response.statusCode, 200);
    })
})