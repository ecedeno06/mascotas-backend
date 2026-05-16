INSERT INTO public.genero_animal
(
    codigo,
    nombregenero,
    esglobal,
    idcompania,
    obs
)

SELECT

    CASE

        -- GLOBAL
        WHEN TRUE = TRUE THEN

            LPAD(
                (
                    COALESCE(
                        MAX(
                            CASE
                                WHEN esglobal = TRUE
                                THEN CAST(codigo AS INTEGER)
                            END
                        ),
                        0
                    ) + 1
                )::TEXT,
                2,
                '0'
            )

        -- NO GLOBAL
        ELSE

            LPAD(1::TEXT, 3, '0') ||

            LPAD(
                (
                    COALESCE(
                        MAX(
                            CASE
                                WHEN esglobal = FALSE
                                AND idcompania = 1
                                THEN RIGHT(codigo, 3)::INTEGER
                            END
                        ),
                        0
                    ) + 1
                )::TEXT,
                3,
                '0'
            )

    END AS codigo,

    'Reptil' AS nombregenero,

    FALSE AS esglobal,

    1 AS idcompania,

    'Iguana' AS obs

FROM public.genero_animal

RETURNING *;