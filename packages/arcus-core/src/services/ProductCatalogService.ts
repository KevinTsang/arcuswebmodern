import Bridge from '../bridge';

const ProductCatalogService = {
  GetProductCatalog(place?: string): Promise<Record<string, unknown>> {
    return Bridge.restfulRequest('prodcat:GetProductCatalog', 'SERV:prodcat:', { place });
  },

  GetCategories(place?: string): Promise<Record<string, unknown>> {
    return Bridge.restfulRequest('prodcat:GetCategories', 'SERV:prodcat:', { place });
  },

  GetBrands(place?: string): Promise<Record<string, unknown>> {
    return Bridge.restfulRequest('prodcat:GetBrands', 'SERV:prodcat:', { place });
  },

  GetProductsByBrand(place: string | undefined, brand: string, hubrequired?: boolean): Promise<Record<string, unknown>> {
    return Bridge.restfulRequest('prodcat:GetProductsByBrand', 'SERV:prodcat:', { place, brand, hubrequired });
  },

  GetProductsByCategory(place: string | undefined, category: string): Promise<Record<string, unknown>> {
    return Bridge.restfulRequest('prodcat:GetProductsByCategory', 'SERV:prodcat:', { place, category });
  },

  GetProducts(place?: string, include?: string, hubRequired?: boolean): Promise<Record<string, unknown>> {
    return Bridge.restfulRequest('prodcat:GetProducts', 'SERV:prodcat:', { place, include, hubRequired });
  },

  FindProducts(place: string | undefined, search: string): Promise<Record<string, unknown>> {
    return Bridge.restfulRequest('prodcat:FindProducts', 'SERV:prodcat:', { place, search });
  },

  GetProduct(place: string | undefined, id: string): Promise<Record<string, unknown>> {
    return Bridge.restfulRequest('prodcat:GetProduct', 'SERV:prodcat:', { place, id });
  },
};

export default ProductCatalogService;
