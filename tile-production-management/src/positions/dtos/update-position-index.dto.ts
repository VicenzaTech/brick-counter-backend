import { IsNumber, Min } from "class-validator";

export class UpdatePossitionIndexDto {
    @IsNumber()
    @Min(1, {message: "Possition must greater than 1"})
    index: number;
}