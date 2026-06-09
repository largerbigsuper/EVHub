class AppException(Exception):
    def __init__(self, code: int, message: str, status_code: int = 400):
        self.code = code
        self.message = message
        self.status_code = status_code


class NotFoundError(AppException):
    def __init__(self, resource: str = "资源"):
        super().__init__(404, f"{resource}不存在", 404)


class UnauthorizedError(AppException):
    def __init__(self):
        super().__init__(401, "未登录或 Token 已过期", 401)


class ForbiddenError(AppException):
    def __init__(self):
        super().__init__(403, "权限不足", 403)


class DuplicateError(AppException):
    def __init__(self, field: str = "字段"):
        super().__init__(409, f"{field}已存在", 409)


class ValidationError(AppException):
    def __init__(self, message: str = "参数校验失败"):
        super().__init__(422, message, 422)


class BadRequestError(AppException):
    def __init__(self, message: str = "请求参数错误"):
        super().__init__(400, message, 400)