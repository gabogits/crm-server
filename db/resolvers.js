const Usuario = require("../models/Usuario");
const Producto = require("../models/Producto");
const Cliente = require("../models/Cliente");
const Pedido = require("../models/Pedido");
const bcryptjs = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config({ path: "variables.env" });

const crearToken = (usuario, secreta, expiresIn) => {
  const { id, email, nombre, apellido } = usuario;

  return jwt.sign(
    {
      id,
      email,
      nombre,
      apellido,
    },
    secreta,
    { expiresIn }
  );
};
const resolvers = {
  Query: {
    obtenerUsuario: async (_, { token }) => {
      //con jwt tenemos que firmar el token para crearlo jwt.sig

      // y también verificarlo jwt.verify(

      const usuarioId = await jwt.verify(token, process.env.SECRETA);

      return usuarioId;
    },

    obtenerProductos: async () => {
      try {
        const productos = await Producto.find({});
        return productos;
      } catch (error) {
        console.log(error);
      }
    },

    obtenerProducto: async (_, { id }) => {
      const producto = await Producto.findById(id);
      console.log(producto);
      if (!producto) {
        throw new Error("producto no encontrado");
      }
      return producto;
    },
    obtenerClientes: async () => {
      try {
        const clientes = await Cliente.find({});
        return clientes;
      } catch (error) {
        console.log("error", error);
      }
    },
    obtenerClientesVendedor: async (_, {}, ctx) => {
      try {
        const clientes = await Cliente.find({
          vendedor: ctx.usuario.id.toString(),
        });
        return clientes;
      } catch (error) {
        console.log("error", error);
      }
    },
    obtenerCliente: async (_, { id }, ctx) => {
      //revisar el cliente o no
      const cliente = await Cliente.findById(id);
      if (!cliente) {
        throw new Error("Cliente no encontradp");
      }
      //quièn puede verlo o no
      if (cliente.vendedor.toString() !== ctx.usuario.id) {
        throw new Error("No tienes permiso ver al cliente");
      }
      return cliente;
    },
    obtenerPedidos: async () => {
      try {
        const pedidos = await Pedido.find({});
        return pedidos;
      } catch (error) {
        console.log(error);
      }
    },
    obtenerPedidosVendedor: async (_, {}, ctx) => {
      try {
        const pedidos = await Pedido.find({ vendedor: ctx.usuario.id });
        return pedidos;
      } catch (error) {
        console.log(error);
      }
    },
    obtenerPedido: async (_, { id }, ctx) => {
      //si existe el pedido o no
      const pedido = await Pedido.findById(id);

      if (!pedido) {
        throw new Error("No existe el pedido");
      }

      //Solo quién lo creo puedo verlo
      if (pedido.vendedor.toString() !== ctx.usuario.id) {
        throw new Error("No tienes permiso ver ese pedido");
      }

      // retornar el resultado
      return pedido;
    },
    obtenerPedidoEstado: async (_, { estado }, ctx) => {
      const pedidos = await Pedido.find({ vendedor: ctx.usuario.id, estado });

      return pedidos;
    },
    mejoresClientes: async () => {
      const clientes = await Pedido.aggregate([
        //Pedido.aggregate realiza muchas operaciones, pero al final regresa un solo resultado
        { $match: { estado: "COMPLETADO" } }, //$match : Es de mongodb es como un where
        {
          $group: {
            //{$group cada vez que veas el simbolo de $ es codigo de mongo
            _id: "$cliente",
            total: { $sum: "$total" },
          },
        },
        {
          $lookup: {
            from: "clientes",
            localField: "_id",
            foreignField: "_id",
            as: "cliente",
          },
        },
        {
          $limit: 10,
        },
        {
          $sort: { total: -1 },
        },
      ]);

      return clientes;
    },
    mejoresVendedores: async () => {
      const vendedores = await Pedido.aggregate([
        { $match: { estado: "COMPLETADO" } },
        {
          $group: {
            _id: "$vendedor",
            total: { $sum: "$total" },
          },
        },
        {
          $lookup: {
            from: "usuarios",
            localField: "_id",
            foreignField: "_id",
            as: "vendedor",
          },
        },
        {
          $limit: 3,
        },
        {
          $sort: { total: -1 },
        },
      ]);
      return vendedores;
    },
    buscarProducto: async (_, {texto}, ) => {
      const productos =  await Producto.find({$text: {$search: texto}}).limit(10)

      return productos;
    }
  },
  Mutation: {
    nuevoUsuario: async (_, { input }) => {
      const { email, password } = input;

      //revisar si el usuario ya esta registrado
      const existeUsuario = await Usuario.findOne({ email });
      console.log(existeUsuario);

      if (existeUsuario) {
        throw new Error("el usuario ya esta registrado");
      }
      //hashear el password
      const salt = await bcryptjs.genSalt(10);
      input.password = await bcryptjs.hash(password, salt); //tomar el password tal cual password para sobrescribirlo  hasheado del objeto input.password
      //guardarlo en la base de datos
      console.log(input);
      try {
        const usuario = new Usuario(input);
        usuario.save();
        return usuario;
      } catch (error) {
        console.log(error);
      }
    },
    autenticarUsuario: async (_, { input }) => {
      const { email, password } = input;
      //Si el usuario existe

      const existeUsuario = await Usuario.findOne({ email });
      console.log(existeUsuario);

      if (!existeUsuario) {
        throw new Error("el usuario no existe");
      }

      // revisar si el password e correcto
      const passwordCorrecto = await bcryptjs.compare(
        password,
        existeUsuario.password
      );
      if (!passwordCorrecto) {
        throw new Error("el password es incorrecto");
      }

      //crear el token

      return {
        token: crearToken(existeUsuario, process.env.SECRETA, "24H"),
      };
    },

    nuevoProducto: async (_, { input }) => {
      try {
        const producto = new Producto(input);

        //Almacenar en la bd
        const resultado = await producto.save();
        return resultado;
      } catch (error) {
        console.log(error);
      }
    },
    actualizarProducto: async (_, { id, input }) => {
      let producto = await Producto.findById(id);
      console.log(producto);
      if (!producto) {
        throw new Error("producto no encontrado");
      }

      //guarda en la base de datos
      producto = await Producto.findOneAndUpdate({ _id: id }, input, {
        new: true,
      });
      return producto;
    },
    eliminarProducto: async (_, { id }) => {
      let producto = await Producto.findById(id);
      console.log(producto);
      if (!producto) {
        throw new Error("producto no encontrado");
      }
      //eliminar producto
      producto = await Producto.findOneAndDelete({ _id: id });
      return "Producto eliminado";
    },

    nuevoCliente: async (_, { input }, ctx) => {
      console.log(ctx);
      console.log(input);
      const { email } = input;

      //verificar si el cliente ya esta registrado
      const cliente = await Cliente.findOne({ email });
      if (cliente) {
        throw new Error("ese cliente ya está registrado");
      }

      const nuevoCliente = new Cliente(input);
      //asignar el vendedor
      nuevoCliente.vendedor = ctx.usuario.id;

      //guarda en la base de datos

      try {
        const resultado = await nuevoCliente.save();
        return resultado;
      } catch (error) {
        console.log(error, "error");
      }
    },
    actualizarCliente: async (_, { id, input }, ctx) => {
      //verificar si el cliente existe
      let cliente = await Cliente.findById(id);
      if (!cliente) {
        throw new Error("ese cliente no existe");
      }

      //verificar si el vendedor es el quién  edita
      if (cliente.vendedor.toString() !== ctx.usuario.id) {
        throw new Error("No tienes permiso acualizar este cliente");
      }

      //guadar el cliente
      cliente = await Cliente.findOneAndUpdate({ _id: id }, input, {
        new: true,
      });
      return cliente;
    },
    eliminarCliente: async (_, { id }, ctx) => {
      let cliente = await Cliente.findById(id);
      if (!cliente) {
        throw new Error("ese cliente no existe");
      }

      //verificar si el vendedor es el quién  edita
      if (cliente.vendedor.toString() !== ctx.usuario.id) {
        throw new Error("No tienes permiso eliminar este cliente");
      }

      //Eliminr cliente

      await Cliente.findOneAndDelete({ _id: id });
      return "Cliente Eliminado";
    },

    nuevoPedido: async (_, { input }, ctx) => {
      const { cliente, pedido } = input;

      let clienteExiste = await Cliente.findById(cliente);
      //verificar si el cliente existe

      if (!clienteExiste) {
        throw new Error("ese cliente no existe");
      }

      //verificar si el cliente es del  vendedor
      if (clienteExiste.vendedor.toString() !== ctx.usuario.id) {
        throw new Error("No tienes permiso asignar pedido de este cliente");
      }

      //revisar que el stock este disponible
      console.log(input);

      for await (const articulo of pedido) {
        const { id } = articulo;
        const producto = await Producto.findById(id);

        if (articulo.cantidad > producto.existencia) {
          throw new Error(
            `El articulo ${producto.nombre} excede la cantidad disponible`
          );
        } else {
          producto.existencia = producto.existencia - articulo.cantidad;

          await producto.save();
        }
      }
      // el problema con forEach      pedido.forEach(async articulo => { es que es asyncrono o sea que estaria ejecutando el siguiente codigo sin esperarse a paras las
      //las validaciones revias
      //se puede resolver con un nuevo operador asyncrono que se llama for await   for await (const articulo of pedido) {

      console.log("despues del error");

      //crear un nuevo pedido
      const nuevoPedido = new Pedido(input);

      //asignarle un vendedor
      nuevoPedido.vendedor = ctx.usuario.id;
      //guardarlo en la case datos
      const resultado = await nuevoPedido.save();
      return resultado;
    },
    actualizarPedido: async (_, { id, input }, ctx) => {
      const { cliente, pedido } = input;
      // verificar si el pedido existe
      const existePedido = await Pedido.findById(id);

      if (!existePedido) {
        throw new Error("No existe el pedido");
      }

      //sli el cliente existe

      const clienteExiste = await Cliente.findById(cliente);

      if (!clienteExiste) {
        throw new Error("El cliente no existe");
      }
      //si el pedido pertenece al vendedor

      if (clienteExiste.vendedor.toString() !== ctx.usuario.id) {
        throw new Error("No tienes permiso editar este pedido");
      }

      //revisar el stock
      if (pedido) {
        for await (const articulo of pedido) {
          const { id } = articulo;
          const producto = await Producto.findById(id);

          if (articulo.cantidad > producto.existencia) {
            throw new Error(
              `El articulo ${producto.nombre} excede la cantidad disponible`
            );
          } else {
            producto.existencia = producto.existencia - articulo.cantidad;

            await producto.save();
          }
        }
      }

      //Guardar el pedido

      const resultado = await Pedido.findOneAndUpdate({ _id: id }, input, {
        new: true,
      });
      return resultado;
    },

    eliminarPedido: async (_, { id }, ctx) => {
      const existePedido = await Pedido.findById(id);

      if (!existePedido) {
        throw new Error("No existe el pedido");
      }
      //si el  pedido pertenece al vendedor

      if (existePedido.vendedor.toString() !== ctx.usuario.id) {
        throw new Error("No tienes permiso borrar este pedido");
      }

      await Pedido.findOneAndDelete({ _id: id });

      return "Pedido eliminado";
    },
  },
};

module.exports = resolvers;
