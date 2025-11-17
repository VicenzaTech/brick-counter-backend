import { IsNotEmpty, IsString, MinLength } from "class-validator";

const USERNAME_EMPTY_MESSAGE = 'Tên đăng nhập không được để trống'
const USERNAME_MIN_LENGTH_MESSAGE = 'Tên đăng nhập phải có ít nhất 3 ký tự'

const PASSWORD_EMPTY_MESSAGE = 'Mật khẩu không được để trống'
const PASSWORD_MIN_LENGTH_MESSAGE = 'Mật khẩu phải có ít nhất 3 ký tự'

export class LoginDTO {
    @IsString()
    @IsNotEmpty({ message: USERNAME_EMPTY_MESSAGE })
    @MinLength(3, { message: USERNAME_MIN_LENGTH_MESSAGE })
    identifier: string;

    @IsString()
    @IsNotEmpty({ message: PASSWORD_EMPTY_MESSAGE })
    @MinLength(3, { message:  PASSWORD_MIN_LENGTH_MESSAGE})
    password: string;
}