class ApiResponse {
  static send(res, statusCode, data) {
    return res.status(statusCode).json(data);
  }

  static ok(res, data = {}) {
    return this.send(res, 200, data );
  }

  static unauthorized(res, message = 'Unauthorized') {
    return this.send(res, 401, { error: message, success: false });
  }

  static badRequest(res, message = 'Bad Request') {
    return this.send(res, 400, { error: message, success: false});
  }

  static notFound(res, message = 'Not Found') {
    return this.send(res, 404, { error: message, success: false });
  }

  static internalServerError(res, message = 'Internal Server Error') {
    return this.send(res, 500, { error: message, success: false });
  }

  static overrideRequest(res, message){
    return this.send(res, 450, {error: message, success: false});
  }
}
module.exports = ApiResponse