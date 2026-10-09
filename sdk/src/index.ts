import { HttpClient, ClientConfig } from "./client";
import { DocumentsResource } from "./resources/documents";
import { SignersResource } from "./resources/signers";
import { TemplatesResource } from "./resources/templates";
import { EmbedResource } from "./resources/embed";
import { WebhooksResource } from "./resources/webhooks";
import { OrganizationResource } from "./resources/organization";
import { ClientsResource } from "./resources/clients";

export class eFinSign {
  readonly documents: DocumentsResource;
  readonly signers: SignersResource;
  readonly templates: TemplatesResource;
  readonly embed: EmbedResource;
  readonly webhooks: WebhooksResource;
  readonly organization: OrganizationResource;
  readonly clients: ClientsResource;

  private client: HttpClient;

  constructor(config: ClientConfig) {
    this.client = new HttpClient(config);
    this.documents = new DocumentsResource(this.client);
    this.signers = new SignersResource(this.client);
    this.templates = new TemplatesResource(this.client);
    this.embed = new EmbedResource(this.client);
    this.webhooks = new WebhooksResource(this.client);
    this.organization = new OrganizationResource(this.client);
    this.clients = new ClientsResource(this.client);
  }
}

export default eFinSign;

export {
  eFinSignError,
  type Document,
  type DocumentDetail,
  type Signer,
  type SignerWithFields,
  type Field,
  type FieldInput,
  type Template,
  type Webhook,
  type WebhookCreated,
  type Organization,
  type Client,
  type ClientInput,
  type Usage,
  type SigningUrlResult,
  type PaginationMeta,
  type PaginatedResponse,
  type ApiResponse,
  type ApiInfo,
} from "./types";
