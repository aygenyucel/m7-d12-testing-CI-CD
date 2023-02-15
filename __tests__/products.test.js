// By default jest does not work with the new import syntax
// We should add NODE_OPTIONS=--experimental-vm-modules to the test script in package.json to enable the usage of import syntax
// On Windows you cannot use NODE_OPTIONS (and all env vars) from command line --> YOU HAVE TO USE CROSS-ENV PACKAGE TO BE ABLE TO PASS
// ENV VARS TO COMMAND LINE SCRIPTS ON ALL OPERATIVE SYSTEMS!!!

import supertest from "supertest";
import dotenv from "dotenv";
import mongoose from "mongoose";
import server from "../src/server.js";
import ProductsModel from "../src/api/products/model.js";

dotenv.config(); // This command forces .env vars to be loaded into process.env. This is the way to do it whenever you can't use -r dotenv/config

// supertest is capable of executing server.listen of our Express app if we pass the Express server to it
// It will give us back a client that can be used to run http requests on that server

const client = supertest(server);

/* describe("Test APIs", () => {
  it("Should test that GET /test endpoint returns 200 and a body containing a message", async () => {
    const response = await client.get("/test")
    expect(response.status).toBe(200)
    expect(response.body.message).toEqual("Test successfull")
  })
})
 */

const validProduct = {
  name: "A valid product",
  description: "balllablalblabl",
  price: 100,
};

const notValidProduct = {
  name: "A not valid product",
  price: 100,
};

const validResForUpdate = {
  name: 22,
  price: 300,
};
// const notValidResForUpdate = {
//   name: "xxxxxxxxx",
// };

const notExistingId = "123456123456123456123456";

const getExistingId = async () => {
  const response = await client.post("/products").send(validProduct);
  const existingId = response.body._id;
  return existingId;
};

beforeAll(async () => {
  await mongoose.connect(process.env.MONGO_URL_TEST);
  const product = new ProductsModel({
    name: "test",
    description: "blalblabla",
    price: 20,
  });
  await product.save();
});
// beforeAll is a Jest hook ran before all the tests, usually it is used to connect to the db and to do some initial setup (like inserting some mock data in the db)

afterAll(async () => {
  await ProductsModel.deleteMany();
  await mongoose.connection.close();
});
// afterAll hook could be used to clean up the situation (close the connection to Mongo gently and clean up db/collections)

describe("Test APIs", () => {
  it("Should test that the env vars are set correctly", () => {
    expect(process.env.MONGO_URL_TEST).toBeDefined();
  });

  // Fetching on /products/ should return a success status code and a body
  it("Should test that GET /products returns a success status and a body", async () => {
    const response = await client.get("/products").expect(200);
    expect(response.body).toBeDefined();
    console.log(response.body);
  });

  // Create new product on /products should return a valid _id and 201 in case of a valid product, 400 if not
  it("Should test that POST /products returns a valid _id and 201", async () => {
    const response = await client
      .post("/products")
      .send(validProduct)
      .expect(201);
    expect(response.body._id).toBeDefined();
  });

  it("Should test that POST /products with a not valid product returns a 400", async () => {
    await client.post("/products").send(notValidProduct).expect(400);
  });

  // When retrieving the /products/:id endpoint:
  //  - expect requests to be 404 with a non-existing id, like 123456123456123456123456. Use a 24 character ID or casting to ObjectID will fail
  //  - expect requests to return the correct product with a valid id

  it("Should test that GET /products/:productId with a not valid product returns a 404", async () => {
    await client.get(`/products/${notExistingId}`).expect(404);
  });

  it("Should test that GET /products/:productId with a valid id", async () => {
    const existingId = await getExistingId();
    await client.get(`/products/${existingId}`).expect(200);
  });

  // When deleting the /products/:id endpoint:
  // - expect successful 204 response code
  // - expect 404 with a non-existing id
  it("Should test that DELETE /products/:productId with a valid id returns a 204", async () => {
    const existingId = await getExistingId();
    await client.delete(`/products/${existingId}`).expect(204);
  });

  it("Should test that DELETE /products/:productId with a not valid product id returns a 404", async () => {
    await client.delete(`/products/${notExistingId}`).expect(404);
  });

  // When updating a /product/:id endpoint with new data:
  //  - Expect requests to be accepted.
  //  - Expect 404 with a non-existing id
  //  - Expect the response.body.name to be changed
  //  - Expect the typeof name in response.body to be “string”

  it("Should test that PUT /products/:productId with a valid id returns a 200", async () => {
    const existingId = await getExistingId();
    const responseBeforeUpdate = await client.get(`/products/${existingId}`);

    const response = await client
      .put(`/products/${existingId}`)
      .send({ name: "different name" })
      .expect(200);
    expect(responseBeforeUpdate.body.name).not.toEqual(response.body.name);
    expect(typeof response.body.name).toBe("string");
  });

  it("should test that PUT /products/:productId with a non-existing id returns 404", async () => {
    await client.put(`/producsts/${notExistingId}`).expect(404);
  });
});
