import { Database, Collection , Model } from '@nozbe/watermelondb';

interface IData {
  id?: string;
  [key: string]: any;
}

class CreateServiceDB {
  private database: Database;

  constructor(database: Database) {
    this.database = database;
  }

  async create(modelName: string, data: IData): Promise<any> {
    const collection: Collection<any> = this.database.collections.get(modelName);
    return this.database.action(async () => {
      return await collection.create(record => {
        Object.entries(data).forEach(([key, value]) => {
          record[key] = value;
        });
      });
    });
  }
}

class UpdateServiceDB<T extends Model> {
  private database: Database;

  constructor(database: Database) {
    this.database = database;
  }

  async update(modelName: string, data: IData): Promise<any> {
    const collection: Collection<T> = this.database.collections.get(modelName);
    return this.database.action(async () => {
      const record = await collection.find(data.id!);
      return await record.update((rec: T) => {
        Object.entries(data).forEach(([key, value]) => {
          if (key !== 'id') (rec as any)[key] = value;
        });
      });
    });
  }
}


class DeleteServiceDB {
  private database: Database;

  constructor(database: Database) {
    this.database = database;
  }

  async delete(modelName: string, id: string): Promise<any> {
    const collection: Collection<any> = this.database.collections.get(modelName);
    return this.database.action(async () => {
      const record = await collection.find(id);
      return await record.markAsDeleted();
    });
  }
}

class ReadServiceDB {
  private database: Database;

  constructor(database: Database) {
    this.database = database;
  }

  async getAll(modelName: string): Promise<any[]> {
    const collection: Collection<any> = this.database.collections.get(modelName);
    return await collection.query().fetch();
  }

  async findById(modelName: string, id: string): Promise<any> {
    const collection: Collection<any> = this.database.collections.get(modelName);
    return await collection.find(id);
  }
}

class ServiceDBFacade {
  private createService: CreateServiceDB;
  private updateService: UpdateServiceDB<any>;
  private deleteService: DeleteServiceDB;
  private readService: ReadServiceDB;

  constructor(database: Database) {
    this.createService = new CreateServiceDB(database);
    this.updateService = new UpdateServiceDB(database);
    this.deleteService = new DeleteServiceDB(database);
    this.readService = new ReadServiceDB(database);
  }

  create(modelName: string, data: IData) {
    return this.createService.create(modelName, data);
  }

  update(modelName: string, data: IData) {
    return this.updateService.update(modelName, data);
  }

  delete(modelName: string, id: string) {
    return this.deleteService.delete(modelName, id);
  }

  getAll(modelName: string) {
    return this.readService.getAll(modelName);
  }

  findById(modelName: string, id: string) {
    return this.readService.findById(modelName, id);
  }
}

export default ServiceDBFacade;
