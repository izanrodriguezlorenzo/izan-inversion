# izan-inversion (web pública de Izan Rodríguez)

Web personal de inversión: track record, métricas, tesis y watchlist. Repositorio público: solo código, logos y un JSON de porcentajes.

## Cómo trabajar
- Responder en español de España, al grano, datos concretos antes que adjetivos, sin lenguaje de anuncio.
- Si se pide una decisión, dar una sola recomendación.
- Actuar como crítico y auditor: señalar errores conceptuales antes de construir.
- Izan no usa GitHub: Claude crea ramas, commits y PRs y los integra en main. Una fase por PR; parar al final de cada fase y esperar su confirmación.
- No inventar datos (precios, valoraciones, cifras). Si falta un dato, dejarlo vacío y avisar.

## Privacidad (regla absoluta)
- La web solo muestra porcentajes. Nunca patrimonio, número de acciones, cost basis ni valores en euros por posición.
- La única cifra en euros permitida es la frase del gráfico grande: "1.000 € el 8 de febrero de 2022".
- Prohibido en el repo: xlsx, xls, csv, pdf, xml, extractos, capturas con datos reales.
- Antes de cada commit: `python3 scripts/check_privacy.py` (debe imprimir "PRIVACIDAD OK").
- Las tesis se muestran solo para leer, sin descarga.

## Datos
- `data/web-data.json` lo genera el Excel privado (no se edita a mano). Corte actual: ver `meta.corte`.
- Actualización mensual (se puede pasar a quincenal): se sustituye el JSON y se vuelve a pasar la comprobación de privacidad.

## Metodología (debe aparecer en la web)
- Métrica principal: TIR (XIRR). TWR como complemento etiquetado; también para riesgo y comparación con índices.
- Cartera neta de comisiones de operación y de custodia. Índices S&P 500 y Nasdaq 100, versión Total Return en EUR, sin costes.
- Periodos de menos de un año, sin anualizar. TIR del año en curso sin anualizar.
- Índices medidos desde el 1 de enero de cada periodo. Única excepción: el gráfico grande, que mide cartera e índices desde la primera compra.
- S&P 500 y Nasdaq 100 al mismo nivel, sin benchmark "principal".

## Diseño
- Fintech oscuro, sobrio y analítico. Referencias: Pigma y "Amplify strategic cashflow". Las muestras NO son definitivas: se cambiarán cosas, así que todo color, fuente y medida vive en `src/styles/tokens.css`.
- Skills (en `.claude/skills/`): impeccable, emil-design-eng, design-taste-frontend, dataviz. Reparto: Inicio y Sobre mí → taste + impeccable (Persuade); Cartera/métricas → impeccable (Operate); tesis → impeccable (Read); emil en todo (animar poco y con propósito).
- Gráficos: solo ECharts. Nunca doble eje Y; color fijo por serie o empresa (no por ranking); benchmark en línea discontinua; `showSymbol: false` en series diarias; heatmap mensual con escala divergente y gris en 0 %.
- Animaciones obligatorias: (1) línea de 1.000 € que se dibuja con las cifras contando; (2) cursor con panel de valores sobre ese gráfico; (3) gráfico de caídas que se dibuja al hacer scroll. Respetar `prefers-reduced-motion`.
- Composición en gráfico circular: un color por empresa y su logo (`assets/logos/`). Colores en tokens: Meta azul, Amazon naranja, Alphabet rojo, Microsoft verde, DIGI azul oscuro.
- Contacto: tarjetas de red (icono, nombre, usuario, frase, flecha) para LinkedIn y Substack, interactivas: al tocar, el borde cambia de color y se mueve. Diseño propio con el acento de la web, no una copia de otra web.

## Páginas
Inicio, Cartera, Tesis (solo lectura), Watchlist (~46 empresas; sin inventar precios ni valoraciones), Sobre mí, Contacto, Disclaimer, Privacidad. Reseñas de libros: solo cuando haya al menos tres.

## Disclaimer (contenido mínimo)
No es asesoramiento financiero; opiniones personales; rentabilidades pasadas no garantizan resultados futuros; las posiciones pueden cambiar; los datos pueden tener retraso.

## Estructura
- `data/web-data.json`: porcentajes de la cartera.
- `assets/logos/`: logos de las empresas.
- `src/styles/tokens.css`: variables de diseño.
- `scripts/check_privacy.py`: comprobación de privacidad.
- `.claude/skills/`: skills de diseño.

## Fases
1. Base del repo (este documento, estructura, tokens, privacidad, datos, logos).
2. Inicio y gráfico grande (con las tres animaciones).
3. Cartera: composición, métricas, riesgo, caídas, rentabilidad mensual.
4. Tesis y Watchlist.
5. Sobre mí, Contacto, Disclaimer, Privacidad.
6. Publicación (requiere permiso de Izan).
