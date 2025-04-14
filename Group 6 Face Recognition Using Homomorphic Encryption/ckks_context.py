import tenseal as ts

def create_and_save_context():
    context = ts.context(
        ts.SCHEME_TYPE.CKKS,
        poly_modulus_degree=8192,
        coeff_mod_bit_sizes=[60, 40, 40, 60]
    )
    context.global_scale = 2**40
    context.generate_galois_keys()

    with open("ckks_context.tenseal", "wb") as f:
        f.write(context.serialize(save_secret_key=True))

    print("✅ CKKS context saved to ckks_context.tenseal")

create_and_save_context()