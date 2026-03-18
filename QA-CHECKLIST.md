# QA Checklist

## Catalogo publico
- La pagina carga productos sin error inicial.
- Los filtros rapidos de categoria del header funcionan.
- La busqueda filtra por nombre, tono o marca.
- El filtro de marca funciona.
- `Limpiar filtros` regresa a `Todas`.
- Las cards muestran imagen, precio y disponibilidad correctamente.

## Carrito y pedido
- `Agregar` suma productos al carrito.
- `Quitar` elimina productos del carrito.
- El total se actualiza.
- `Enviar pedido por WhatsApp` abre el mensaje correcto.
- El pedido queda registrado en admin.

## Admin
- El acceso admin abre con login correcto.
- `Guardar` actualiza producto.
- `Activar/Desactivar` cambia visibilidad.
- `Duplicar` crea copia.
- La `x` elimina producto.
- Los badges `Imagen antigua` y `Revisar datos` aparecen cuando toca.

## Imagenes
- Subir imagen nueva guarda URL de Storage, no `data:image/...`.
- La portada cambia correctamente.
- La galeria permite cambiar portada y quitar imagenes.
- El modal de imagen publica abre y navega entre imagenes.

## Scanner
- El escaner abre.
- Detecta codigo valido.
- Encuentra producto por codigo de barras.
- Cierra sin dejar la camara colgada.

## Pedidos
- El drawer de pedidos abre.
- Se listan pedidos con fecha y total.
- `PDF` funciona.
- `Eliminar` borra pedido.

## Movil
- Header no se rompe.
- Filtros y cards se ven bien.
- Drawer de carrito y modales se pueden cerrar bien.
- Botones admin siguen siendo tocables.
