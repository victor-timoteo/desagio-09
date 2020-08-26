import { inject, injectable } from 'tsyringe';

import AppError from '@shared/errors/AppError';

import IProductsRepository from '@modules/products/repositories/IProductsRepository';
import ICustomersRepository from '@modules/customers/repositories/ICustomersRepository';
import Order from '../infra/typeorm/entities/Order';
import IOrdersRepository from '../repositories/IOrdersRepository';

interface IProduct {
  id: string;
  quantity: number;
}

interface IRequest {
  customer_id: string;
  products: IProduct[];
}

@injectable()
class CreateOrderService {
  constructor(
    @inject('OrdersRepository')
    private ordersRepository: IOrdersRepository,
    @inject('ProductsRepository')
    private productsRepository: IProductsRepository,
    @inject('CustomersRepository')
    private customersRepository: ICustomersRepository,
  ) {}

  public async execute({ customer_id, products }: IRequest): Promise<Order> {
    const customer = await this.customersRepository.findById(customer_id);

    if (!customer) {
      throw new AppError('Customer does not exist', 400);
    }

    const listProducts = await this.productsRepository.findAllById(
      products.map(item => {
        return { id: item.id };
      }),
    );

    const orderedProducts = products.map(item => {
      const findProduct = listProducts.find(prod => prod.id === item.id);
      if (!findProduct) {
        throw new AppError('Product does not exist', 400);
      }
      if (findProduct.quantity < item.quantity) {
        throw new AppError('Quantity insufficient', 400);
      }

      findProduct.quantity -= item.quantity;

      return {
        product_id: findProduct.id,
        price: findProduct.price,
        quantity: item.quantity,
      };
    });

    await this.productsRepository.updateQuantity(listProducts);

    return this.ordersRepository.create({
      customer,
      products: orderedProducts,
    });
  }
}

export default CreateOrderService;
