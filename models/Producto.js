const mongoose = require("mongoose");

const ProductosSchema = mongoose.Schema({
    nombre: {
        type:String,
        require: true,
        trim: true
    },
    existencia: {
        type:Number,
        require: true,
        trim: true
    },
    precio: {
        type:Number,
        require: true,
        trim: true
    },
    creado: {
        type: Date,
        default:  Date.now()
    }
}); 

ProductosSchema.index({nombre: 'text'}); //habilitar un indice de tipo texto
//especificamos de cual de estos campos vamos a crear un indice, en este caso es nombre 

module.exports = mongoose.model("Producto", ProductosSchema)