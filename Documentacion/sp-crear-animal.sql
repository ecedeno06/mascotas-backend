CREATE OR REPLACE FUNCTION public.sp_crear_genero_animal
(
    p_nombregenero VARCHAR,
    p_esglobal BOOLEAN,
    p_idcompania INTEGER,
    p_obs VARCHAR
)

RETURNS TABLE
(
    id INTEGER,
    codigo VARCHAR,
    nombregenero VARCHAR,
    esglobal BOOLEAN,
    idcompania INTEGER,
    obs VARCHAR
)

LANGUAGE plpgsql

AS
$$

DECLARE

    v_codigo VARCHAR;

BEGIN

    /*
        GENERAR CODIGO GLOBAL
        01
        02
        03
    */

    IF p_esglobal = TRUE THEN

        SELECT
            LPAD(
                (
                    COALESCE(
                        MAX(codigo::INTEGER),
                        0
                    ) + 1
                )::TEXT,
                2,
                '0'
            )
        INTO v_codigo
        FROM public.genero_animal
        WHERE esglobal = TRUE;

    ELSE

        /*
            GENERAR CODIGO POR COMPANIA
            001001
            001002
            002001
        */

        SELECT

            LPAD(p_idcompania::TEXT, 3, '0') ||

            LPAD(
                (
                    COALESCE(
                        MAX(
                            RIGHT(codigo, 3)::INTEGER
                        ),
                        0
                    ) + 1
                )::TEXT,
                3,
                '0'
            )

        INTO v_codigo

        FROM public.genero_animal

        WHERE esglobal = FALSE
        AND idcompania = p_idcompania;

    END IF;

    /*
        INSERTAR REGISTRO
    */

    RETURN QUERY

    INSERT INTO public.genero_animal
    (
        codigo,
        nombregenero,
        esglobal,
        idcompania,
        obs
    )

    VALUES
    (
        v_codigo,
        p_nombregenero,
        p_esglobal,
        CASE
            WHEN p_esglobal = TRUE THEN NULL
            ELSE p_idcompania
        END,
        p_obs
    )

    RETURNING
        genero_animal.id,
        genero_animal.codigo,
        genero_animal.nombregenero,
        genero_animal.esglobal,
        genero_animal.idcompania,
        genero_animal.obs;

END;
$$;


==== como ejecutarlo =====

SELECT *
FROM public.sp_crear_genero_animal
(
   'Kanino',
   TRUE,
   NULL,
   'Perros'
);