import { MongoClient } from "mongodb";
import { I_PRINCETON_COURSES } from "./interface";

export default class PrincetonCourses implements I_PRINCETON_COURSES {
  private mongoURL: string;
  private client: MongoClient;

  constructor() {
    if (!process.env.MONGO_URL) throw new Error("MONGO_URL environment variable is not set.");
    this.mongoURL = process.env.MONGO_URL;
    this.client = new MongoClient(this.mongoURL);
  }

  async connect() {
    try {
      await this.client.connect();
      console.log("Connected to PrincetonCourses MongoDB successfully.");
    } catch (error) {
      console.error("Failed to connect to PrincetonCourses MongoDB:", error);
      throw error;
    } finally {
      await this.client.close();
    }
  }
}
