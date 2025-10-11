import { Sequelize } from "sequelize";
import dotenv from 'dotenv';
dotenv.config();

// const sequelize = new Sequelize("musicdb","postgres","108nmzZ",{
//     host: 'localhost',
//     dialect: 'postgres'
// });
const sequelize = new Sequelize(`${process.env.POSTGRE_DB}`,`${process.env.POSTGRE_USER}`,`${process.env.POSTGRE_PASSWORD}`,{
    host: process.env.POSTGRE_HOST,
    dialect: 'postgres',
    port: 5432,
});

export async function connectToSequilizePostgress() {
    try {
        await sequelize.authenticate();
        await sequelize.sync();
    } catch (error) {
        console.error(error);
    }
}

export default sequelize;