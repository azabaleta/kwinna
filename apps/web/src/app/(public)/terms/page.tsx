import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Términos y Condiciones | Política de Privacidad",
  description:
    "Términos y condiciones de compra, política de cambios y devoluciones, y política de privacidad de Kwinna shop.",
};

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 py-16 md:px-8">

        <header className="mb-12 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
            Términos y Condiciones · Política de Privacidad
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Última actualización: 26 de abril de 2026
          </p>
        </header>

        <div className="space-y-10 text-sm leading-relaxed text-muted-foreground [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-foreground [&_h2]:mb-3 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-foreground [&_h3]:mb-2 [&_p]:mb-3 [&_ul]:mb-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-1 [&_ol]:mb-3 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:space-y-1">

          {/* ─── 1. Generalidades ─── */}
          <section>
            <h2>1. Información General</h2>
            <p>
              El presente documento establece los Términos y Condiciones de uso del sitio web
              <strong className="text-foreground"> kwinna.com.ar </strong>
              (en adelante, "el Sitio") y la Política de Privacidad aplicable a todas las operaciones
              realizadas a través del mismo. Al navegar, registrarte o realizar una compra en el Sitio,
              aceptás íntegramente estos términos.
            </p>
            <p>
              <strong className="text-foreground">Titular:</strong> Kwinna Indumentaria, con domicilio
              comercial en la ciudad de Neuquén, provincia de Neuquén, República Argentina.
            </p>
            <p>
              Kwinna se reserva el derecho de modificar estos términos en cualquier momento. Las
              modificaciones serán efectivas desde su publicación en el Sitio. Es responsabilidad del
              usuario revisar periódicamente esta página.
            </p>
          </section>

          {/* ─── 2. Compras y Pagos ─── */}
          <section>
            <h2>2. Proceso de Compra y Pagos</h2>

            <h3>2.1 Realización de pedidos</h3>
            <p>
              Al confirmar una compra, el/la cliente declara que los datos ingresados (nombre, email,
              teléfono, DNI/CUIL, dirección de envío) son correctos y veraces.
              <strong className="text-foreground"> Kwinna no se responsabiliza por errores, omisiones
              o datos falsos proporcionados por el/la cliente</strong>, incluyendo pero no limitado a:
            </p>
            <ul>
              <li>Dirección de envío incorrecta o incompleta que resulte en demoras, extravíos o costos adicionales de reenvío.</li>
              <li>Email erróneo que impida la recepción de confirmaciones, comprobantes de pago o comunicaciones relacionadas con el pedido.</li>
              <li>Número de teléfono incorrecto que imposibilite la coordinación de entrega o resolución de incidencias.</li>
              <li>DNI/CUIL incorrecto que impida la facturación o genere inconvenientes con la pasarela de pago.</li>
            </ul>
            <p>
              Cualquier costo adicional derivado de la corrección de datos erróneos será a cargo exclusivo del/de la cliente.
            </p>

            <h3>2.2 Precios y disponibilidad</h3>
            <p>
              Los precios publicados en el Sitio son en pesos argentinos (ARS), incluyen IVA cuando
              corresponda y son válidos al momento de la compra. Kwinna se reserva el derecho de
              modificar los precios sin previo aviso.
            </p>
            <p>
              La disponibilidad de productos se actualiza en tiempo real. Sin embargo, en casos
              excepcionales de error de stock o simultaneidad de compras, Kwinna podrá cancelar el
              pedido y reembolsar el importe abonado dentro de las 72 horas hábiles siguientes.
            </p>

            <h3>2.3 Medios de pago</h3>
            <p>
              Los pagos se procesan a través de MercadoPago. Kwinna no almacena datos de tarjetas de
              crédito ni débito. Toda la información financiera es gestionada exclusivamente por la
              plataforma de pagos bajo sus propios estándares de seguridad (PCI-DSS).
            </p>

            <h3>2.4 Confirmación del pedido</h3>
            <p>
              Una vez aprobado el pago por MercadoPago, el/la cliente recibirá un email de confirmación
              con el detalle de la compra. Dicho email constituye el comprobante de la operación.
              Si no recibís el email, verificá tu carpeta de Spam/Correo no deseado o contactanos.
            </p>
          </section>

          {/* ─── 3. Envíos ─── */}
          <section>
            <h2>3. Envíos y Entregas</h2>

            <h3>3.1 Retiro en local</h3>
            <p>
              El/la cliente puede optar por retirar su pedido en el local de Kwinna en Neuquén sin costo
              adicional. El plazo de retiro es de hasta 15 días corridos desde la confirmación del pedido.
              Pasado ese plazo sin retiro ni comunicación, Kwinna se reserva el derecho de disponer del
              producto.
            </p>

            <h3>3.2 Envíos con logística propia (Neuquén y alrededores)</h3>
            <p>
              Para destinos dentro de la zona de cobertura de logística propia (Neuquén, Plottier y
              localidades cercanas), el costo de envío se calcula automáticamente al momento de la compra
              y se suma al total del pedido.
            </p>

            <h3>3.3 Envíos al resto del país</h3>
            <p>
              Para destinos fuera de la zona de logística propia, el envío se coordina de forma
              particular con el/la cliente. El costo estará sujeto a la empresa de transporte
              seleccionada y deberá ser abonado por el/la cliente de forma separada, según se acuerde
              con la vendedora.
            </p>
            <p>
              Kwinna no se responsabiliza por demoras, daños o extravíos ocasionados por empresas de
              transporte de terceros una vez despachada la mercadería.
            </p>
          </section>

          {/* ─── 4. Cambios y Devoluciones ─── */}
          <section>
            <h2>4. Política de Cambios y Devoluciones</h2>

            <h3>4.1 Condiciones para cambios</h3>
            <p>
              Kwinna acepta cambios de productos únicamente bajo las siguientes condiciones, las cuales
              deben cumplirse <strong className="text-foreground">en su totalidad</strong>:
            </p>
            <ol>
              <li>
                <strong className="text-foreground">Plazo:</strong> El cambio debe solicitarse dentro
                de los <strong className="text-foreground">30 (treinta) días corridos</strong> posteriores
                a la fecha de compra.
              </li>
              <li>
                <strong className="text-foreground">Presencial:</strong> El cambio debe realizarse
                <strong className="text-foreground"> de forma presencial en el local físico</strong> de
                Kwinna en Neuquén. No se aceptan cambios por correo ni a distancia.
              </li>
              <li>
                <strong className="text-foreground">Estado del producto:</strong> El producto debe
                encontrarse en <strong className="text-foreground">perfecto estado</strong>, sin uso,
                sin lavar, sin alteraciones y sin olores.
              </li>
              <li>
                <strong className="text-foreground">Etiqueta y bolsa:</strong> El producto debe
                presentarse con su <strong className="text-foreground">etiqueta original</strong> y
                dentro de la <strong className="text-foreground">bolsa de compra</strong> de Kwinna.
              </li>
              <li>
                <strong className="text-foreground">Comprobante:</strong> Se deberá presentar el
                email de confirmación de compra o número de orden como comprobante.
              </li>
            </ol>

            <h3>4.2 Exclusiones</h3>
            <p>No se aceptan cambios en los siguientes casos:</p>
            <ul>
              <li>Productos en oferta, liquidación o con descuento especial (salvo falla de fabricación).</li>
              <li>Ropa interior, trajes de baño y accesorios por razones de higiene.</li>
              <li>Productos personalizados o a pedido.</li>
              <li>Productos que presenten signos de uso, manchas, roturas, alteraciones o lavados.</li>
            </ul>

            <h3>4.3 Devoluciones y reembolsos</h3>
            <p>
              <strong className="text-foreground">No se realizan devoluciones de dinero.</strong> Los
              cambios se efectúan exclusivamente por otro producto de igual o mayor valor disponible en
              stock. En caso de elegir un producto de mayor valor, el/la cliente abonará la diferencia.
              En caso de menor valor, se emitirá un crédito a favor para futuras compras.
            </p>

            <h3>4.4 Productos con fallas de fabricación</h3>
            <p>
              Si el producto presenta una falla de fabricación comprobable, Kwinna procederá al cambio
              sin las restricciones de plazo mencionadas, sujeto a verificación. El/la cliente deberá
              contactarnos para coordinar la revisión del producto.
            </p>
          </section>

          {/* ─── 5. Desistimiento ─── */}
          <section>
            <h2>5. Derecho de Arrepentimiento</h2>
            <p>
              De acuerdo con el artículo 34 de la Ley 24.240 de Defensa del Consumidor de la República
              Argentina, el/la consumidor/a tiene derecho a revocar la aceptación de la compra dentro de
              los <strong className="text-foreground">10 (diez) días corridos</strong> contados a partir
              de la recepción del producto, sin necesidad de justificación y sin costo alguno.
            </p>
            <p>
              Para ejercer este derecho, el/la cliente deberá comunicarse con Kwinna indicando el
              número de orden. El producto deberá ser devuelto en las mismas condiciones en que fue
              recibido (sin uso, con etiquetas y embalaje original). Los gastos de envío de la
              devolución correrán por cuenta del/de la cliente, salvo que el producto presente defectos.
            </p>
          </section>

          {/* ─── 6. Privacidad y Datos Personales ─── */}
          <section>
            <h2>6. Política de Privacidad y Protección de Datos Personales</h2>

            <h3>6.1 Datos que recopilamos</h3>
            <p>
              Al registrarte o realizar una compra en el Sitio, Kwinna recopila los siguientes datos
              personales:
            </p>
            <ul>
              <li>Nombre completo</li>
              <li>Dirección de correo electrónico</li>
              <li>Número de teléfono / celular</li>
              <li>DNI o CUIL</li>
              <li>Dirección de envío (calle, ciudad, provincia, código postal)</li>
              <li>Datos de navegación y preferencias de compra dentro del Sitio</li>
            </ul>

            <h3>6.2 Finalidad del tratamiento</h3>
            <p>Los datos personales recopilados se utilizan para:</p>
            <ul>
              <li>Procesar y gestionar pedidos de compra.</li>
              <li>Coordinar envíos y entregas.</li>
              <li>Enviar confirmaciones de compra, comprobantes de pago y actualizaciones de estado del pedido.</li>
              <li>Alimentar las bases de datos internas del local para mejorar la experiencia de compra y la gestión del negocio.</li>
              <li>Comunicarnos con el/la cliente a través de los canales consentidos (ver punto 6.4).</li>
              <li>Cumplir con obligaciones legales, contables y fiscales.</li>
              <li>Prevenir fraudes y garantizar la seguridad de las transacciones.</li>
            </ul>

            <h3>6.3 Almacenamiento y seguridad</h3>
            <p>
              Los datos personales se almacenan en servidores protegidos con medidas de seguridad
              técnicas y organizativas adecuadas. Kwinna no comparte, vende ni cede datos personales
              a terceros con fines comerciales, salvo los estrictamente necesarios para:
            </p>
            <ul>
              <li>Procesamiento de pagos (MercadoPago).</li>
              <li>Envío de comunicaciones transaccionales (servicio de email).</li>
              <li>Cumplimiento de requerimientos legales o judiciales.</li>
            </ul>

            <h3>6.4 Consentimiento para comunicaciones</h3>
            <p>
              Al realizar una compra o registrarte en el Sitio,
              <strong className="text-foreground"> prestás tu consentimiento expreso </strong>
              para que Kwinna se comunique con vos a través de los siguientes canales:
            </p>
            <ul>
              <li><strong className="text-foreground">Correo electrónico</strong> — para confirmaciones, novedades y promociones.</li>
              <li><strong className="text-foreground">WhatsApp</strong> — para seguimiento de pedidos, coordinación de envíos y atención al cliente.</li>
              <li><strong className="text-foreground">Llamada telefónica</strong> — para resolver incidencias o coordinar entregas.</li>
              <li><strong className="text-foreground">Redes sociales</strong> (Instagram, Facebook u otras) — para comunicación general y promociones.</li>
            </ul>
            <p>
              Podés revocar este consentimiento en cualquier momento enviando un email a
              <strong className="text-foreground"> ventas@kwinna.com.ar </strong>
              con el asunto "Baja de comunicaciones". La revocación no afecta las comunicaciones
              estrictamente transaccionales (confirmaciones de compra, actualizaciones de envío).
            </p>

            <h3>6.5 Derechos del titular de los datos</h3>
            <p>
              De acuerdo con la Ley 25.326 de Protección de Datos Personales de la República
              Argentina, tenés derecho a:
            </p>
            <ul>
              <li><strong className="text-foreground">Acceso:</strong> Solicitar información sobre los datos personales que poseemos.</li>
              <li><strong className="text-foreground">Rectificación:</strong> Solicitar la corrección de datos inexactos o incompletos.</li>
              <li><strong className="text-foreground">Supresión:</strong> Solicitar la eliminación de tus datos de nuestras bases (salvo obligaciones legales de retención).</li>
              <li><strong className="text-foreground">Oposición:</strong> Oponerte al tratamiento de tus datos para fines distintos a los transaccionales.</li>
            </ul>
            <p>
              Para ejercer estos derechos, contactanos a
              <strong className="text-foreground"> ventas@kwinna.com.ar</strong>.
            </p>
            <p className="text-xs text-muted-foreground/60">
              La AGENCIA DE ACCESO A LA INFORMACIÓN PÚBLICA, en su carácter de Órgano de Control de
              la Ley N° 25.326, tiene la atribución de atender las denuncias y reclamos que interpongan
              quienes resulten afectados en sus derechos por incumplimiento de las normas vigentes en
              materia de protección de datos personales.
            </p>
          </section>

          {/* ─── 7. Propiedad intelectual ─── */}
          <section>
            <h2>7. Propiedad Intelectual</h2>
            <p>
              Todo el contenido del Sitio — incluyendo pero no limitado a textos, fotografías, diseños,
              logotipos, isotipos, nombres comerciales, gráficos y código fuente — es propiedad
              exclusiva de Kwinna o de sus respectivos titulares, y se encuentra protegido por las leyes
              argentinas de propiedad intelectual.
            </p>
            <p>
              Queda prohibida la reproducción, distribución, modificación o uso comercial del contenido
              del Sitio sin autorización previa y por escrito de Kwinna.
            </p>
          </section>

          {/* ─── 8. Limitación de responsabilidad ─── */}
          <section>
            <h2>8. Limitación de Responsabilidad</h2>
            <p>Kwinna no será responsable por:</p>
            <ul>
              <li>Interrupciones temporales del Sitio por mantenimiento, actualizaciones o causas de fuerza mayor.</li>
              <li>Diferencias de color o textura entre la imagen del producto en pantalla y el producto real, derivadas de la calibración del monitor del usuario.</li>
              <li>Daños o perjuicios derivados del uso indebido del Sitio por parte del usuario.</li>
              <li>Demoras o incumplimientos causados por empresas de transporte de terceros.</li>
              <li>Consecuencias derivadas de la información errónea proporcionada por el/la cliente.</li>
            </ul>
          </section>

          {/* ─── 9. Ley aplicable ─── */}
          <section>
            <h2>9. Ley Aplicable y Jurisdicción</h2>
            <p>
              Estos términos se rigen por las leyes de la República Argentina. Para cualquier
              controversia que surja en relación con el uso del Sitio o las compras realizadas,
              las partes se someten a la jurisdicción de los Tribunales Ordinarios de la ciudad
              de Neuquén, provincia de Neuquén, renunciando a cualquier otro fuero que pudiera
              corresponderles.
            </p>
          </section>

          {/* ─── 10. Contacto ─── */}
          <section>
            <h2>10. Contacto</h2>
            <p>
              Para consultas, reclamos o ejercicio de derechos sobre tus datos personales, podés
              contactarnos a:
            </p>
            <ul>
              <li><strong className="text-foreground">Email:</strong> ventas@kwinna.com.ar</li>
              <li><strong className="text-foreground">Instagram:</strong> @kwinna.ok</li>
              <li><strong className="text-foreground">Domicilio comercial:</strong> Neuquén, Neuquén, Argentina</li>
            </ul>
          </section>

        </div>
      </div>
    </main>
  );
}
