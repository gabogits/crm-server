const {ApolloServer } = require('apollo-server');
const typeDefs = require("./db/schema")
const resolvers = require("./db/resolvers")
const conectarDB = require("./config/db");
const jwt = require("jsonwebtoken");
require('dotenv').config({path: 'variables.env'})

//conectar a la base de datos
conectarDB();
//Servidor
const server = new ApolloServer ({typeDefs, resolvers, context: ({req}) => {
    //console.log(req.headers['authorization'])


    console.log(req.headers)
    const token = req.headers['authorization'] || '';
    if(token) {
        try {
            const usuario = jwt.verify(token.replace('Bearer ', ''), process.env.SECRETA)
          
            return {
                usuario
            }
        } catch (error) {
            console.log("error", error)
        }
    }

}}); //al crear una nueva instancia del servidor, le pasamos los typeDefs y los resolvers

server.listen({port: process.env.PORT || 4000 }).then(({url}) =>{
    console.log(`Servidor listo en la URL ${url}`)
});