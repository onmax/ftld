import { Result } from "./result";

// @ts-expect-error
export const Brand: {
  /**
   * Create a validated brand constructor that checks the value using the provided validation function.
   * @template E - The error type to return when the validation fails.
   * @template TBrand - The brand type to apply.
   * @param {function(value: Unbrand<TBrand>): boolean} validate - The validation function.
   * @param {function(value: Unbrand<TBrand>): E} [onErr] - The optional function to produce an error when the validation fails.
   * @returns {ValidatedBrandConstructor<E, TBrand>} - The validated brand constructor.
   */
  <E, TBrand>(
    validate: (value: Unbrand<TBrand>) => boolean,
    onErr: (value: Unbrand<TBrand>) => E
  ): ValidatedBrandConstructor<E, TBrand>;

  /**
   * Create a nominal brand constructor.
   * @template TBrand - The nominal brand type to apply.
   * @returns {NominalBrandConstructor<TBrand>} - The nominal brand constructor.
   */
  <TBrand>(): NominalBrandConstructor<TBrand>;

  /**
   * Compose multiple brand constructors into a single brand constructor.
   * @template TBrands - A tuple of brand constructors to compose.
   * @param {...EnsureCommonBase<TBrands>} brands - The brand constructors to compose.
   * @returns {ComposedBrandConstructor} - The composed brand constructor.
   */
  compose<
    TBrands extends readonly [
      BrandConstructor<any, any>,
      ...BrandConstructor<any, any>[]
    ]
  >(
    ...brands: EnsureCommonBase<TBrands>
  ): ComposedBrandConstructor<
    {
      [B in keyof TBrands]: PickErrorFromBrandConstructor<TBrands[B]>;
    }[number],
    UnionToIntersection<
      { [B in keyof TBrands]: PickBrandFromConstructor<TBrands[B]> }[number]
    > extends infer X extends Brand<any>
      ? X
      : Brand<any>
  >;
} = (validate, onErr) => (value) => {
  if (validate) {
    return Result.fromPredicate(validate, value, onErr);
  }
  return value;
};

Brand.compose =
  (...brands) =>
  (value) => {
    const results = brands.map((brand) => brand(value));

    return Result.validate(results as any) as any;
  };

type EnsureCommonBase<
  TBrands extends readonly [
    BrandConstructor<any, any>,
    ...BrandConstructor<any, any>[]
  ]
> = {
  [B in keyof TBrands]: Unbrand<
    PickBrandFromConstructor<TBrands[0]>
  > extends Unbrand<PickBrandFromConstructor<TBrands[B]>>
    ? Unbrand<PickBrandFromConstructor<TBrands[B]>> extends Unbrand<
        PickBrandFromConstructor<TBrands[0]>
      >
      ? TBrands[B]
      : TBrands[B]
    : "ERROR: All brands should have the same base type";
};

const BrandSymbol: unique symbol = Symbol.for("ftld/Brand");

type BrandId = typeof BrandSymbol;

type UnionToIntersection<T> = (T extends any ? (x: T) => any : never) extends (
  x: infer R
) => any
  ? R
  : never;

type Brands<P> = P extends Brander<any>
  ? UnionToIntersection<
      {
        [k in keyof P[BrandId]]: k extends string | symbol ? Brander<k> : never;
      }[keyof P[BrandId]]
    >
  : never;

export type Unbrand<P> = P extends infer Q & Brands<P> ? Q : P;

// credit to EffectTs/Data/Brand
interface Brander<in out K extends string | symbol> {
  readonly [BrandSymbol]: {
    readonly [k in K]: K;
  };
}

export type Brand<A, K extends string | symbol = typeof BrandSymbol> = A &
  Brander<K>;

export namespace Brand {
  export type Infer<A> = A extends Brand<infer B>
    ? B
    : A extends BrandConstructor<unknown, infer B>
    ? B
    : never;
}

type NominalBrandConstructor<A> = (value: Unbrand<A>) => A;

type ValidatedBrandConstructor<E, A> = (value: Unbrand<A>) => Result<E, A>;

type ComposedBrandConstructor<E, A> = (value: Unbrand<A>) => Result<E[], A>;

type BrandConstructor<E, A> =
  | NominalBrandConstructor<A>
  | ValidatedBrandConstructor<E, A>
  | ComposedBrandConstructor<E, A>;

type PickErrorFromBrandConstructor<A> = A extends BrandConstructor<infer E, any>
  ? E
  : never;

type PickBrandFromConstructor<A> = A extends BrandConstructor<infer _E, infer B>
  ? B
  : never;
