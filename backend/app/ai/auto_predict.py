# ============================================================
# VISIONINSPECT AI
# AUTOMATIC CATEGORY ROUTER
#
# IMPORTANT:
#
# This module does NOT replace the existing predict.py.
#
# Existing predict.py remains responsible for:
#
# category-specific ResNet18
# defect classification
# quality assessment
#
# This layer only automatically identifies the product first.
# ============================================================


from app.ai.predict import (
    predict as defect_predict
)


from app.ai.product_classifier import (
    predict_product_category
)


# ============================================================
# PRODUCTION PREDICT
# ============================================================

def predict(
    image_path
):

    # --------------------------------------------------------
    # STAGE 1
    # AUTOMATIC PRODUCT IDENTIFICATION
    # --------------------------------------------------------

    category_result = (
        predict_product_category(
            image_path
        )
    )


    category = (
        category_result[
            "category"
        ]
    )


    category_confidence = (
        category_result[
            "confidence"
        ]
    )


    # --------------------------------------------------------
    # STAGE 2
    # EXISTING CATEGORY-SPECIFIC MODEL
    # --------------------------------------------------------

    result = (
        defect_predict(

            image_path,

            category=
                category,
        )
    )


    # --------------------------------------------------------
    # SAFETY
    # --------------------------------------------------------

    if not isinstance(
        result,
        dict
    ):

        raise RuntimeError(

            "Existing prediction engine "
            "returned an invalid result."
        )


    # --------------------------------------------------------
    # REPLACE EXPLICIT ROUTING INFORMATION
    #
    # Existing predict.py sees an explicit category because
    # this router supplied it internally.
    #
    # The USER did not supply the category.
    #
    # So expose the true production routing information.
    # --------------------------------------------------------

    result[
        "product_category"
    ] = category


    result[
        "category_confidence"
    ] = category_confidence


    result[
        "category_routing"
    ] = (
        "automatic_category_classifier"
    )


    result[
        "category_top_predictions"
    ] = (
        category_result.get(
            "top_predictions",
            []
        )
    )


    return result