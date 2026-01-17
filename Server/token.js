import jwt from 'jsonwebtoken';
let secret = '5c1f8d1a4b9b95e6a479b73dc4dd4cb7bc48209a1cc313a230566f1597ebb32e1c73c747679ef320ade3e0c75b4341a6b9e860699e1615c99176f0396756fae6'

// const signToken = async () => {
//     let payload = {
//         userId: '695ac0b79a8d4044810f1351',
//         email: 'ahmed@gmail.com',
//         role: 'Stock-Keeper',
//     }
//     let token = jwt.sign(payload, secret);
//     console.log(token, "token");
// }

// signToken();
const checktoken = async () => {
    let token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OTVhYzBiNzlhOGQ0MDQ0ODEwZjEzNTEiLCJlbWFpbCI6ImFobWVkQGdtYWlsLmNvbSIsInJvbGUiOiJTdG9jay1LZWVwZXIiLCJpYXQiOjE3Njc1NTU1MzR9.tAH7HnGv8qqZvdBFNdLBCE2Y2_QHqf43KTOvGYv-2Bg'

    jwt.verify(token, secret, (err, decoded) => {
        console.log(err, "err");
        console.log(decoded, "decoded");
    });
}

checktoken();