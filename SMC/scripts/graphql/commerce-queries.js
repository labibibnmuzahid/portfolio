// eslint-disable-next-line import/prefer-default-export
export const PRODUCT_PRICE_QUERY = `query ProductPriceQuery($skus: [String]!, $pageSize: Int!, $currentPage: Int!) {
  products( filter: { sku: { in: $skus } } pageSize: $pageSize currentPage: $currentPage ) {
    items {
      sku
      price_range {
        minimum_price {
          regular_price {
            value
          }
          final_price {
            value
          }
        }
        maximum_price {
          regular_price {
            value
          }
          final_price {
            value
          }
        }
      }
      ... on ConfigurableProduct {
        variants {
          product {
            sku
            price_range {
              minimum_price {
                regular_price {
                  value
                }
                final_price {
                  value
                }
              }
              maximum_price {
                regular_price {
                  value
                }
                final_price {
                  value
                }
              }
            }
          }
        }
      }
    }
  }
}`;