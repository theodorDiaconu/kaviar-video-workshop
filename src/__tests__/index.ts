import {
  Kernel,
  Bundle,
  KernelPhase,
  Service,
  Inject,
  Token,
  EventManager,
  Event,
  Listener,
  On,
  BundleBeforePrepareEvent,
  KernelAfterInitEvent,
  Exception,
} from "@kaviar/core";

describe("Core", () => {
  test("Our first kernel", async () => {
    const kernel = new Kernel();
    await kernel.init();

    expect(kernel.getPhase()).toBe(KernelPhase.INITIALISED);
  });

  test("Bundles", async () => {
    class DatabaseBundle extends Bundle {
      async init() {
        console.log("I am initialised");
      }
    }
    class APIBundle extends Bundle {
      async init() {
        console.log("I also am initialised");
      }
    }

    const kernel = new Kernel();
    kernel.addBundle(new DatabaseBundle());
    kernel.addBundle(new APIBundle());

    await kernel.init();
    // add bundles
    // show instantiation logic
  });

  test("Dependency Injection", async () => {
    const DATABASE_URI = new Token("DATABASE URI");
    const DATABASE_SERVICE = new Token("DATABASE SERVICE");

    @Service()
    class DatabaseService {
      constructor(@Inject(DATABASE_URI) public readonly databaseUri) {}

      getUsers() {}
    }

    @Service()
    class SecurityService {
      @Inject(DATABASE_SERVICE)
      public readonly databaseService: DatabaseService;
    }

    class DatabaseBundle extends Bundle<{
      databaseUri: string;
    }> {
      async init() {
        this.container.set({
          id: DATABASE_SERVICE,
          type: DatabaseService,
        });
        this.container.set(DATABASE_URI, this.config.databaseUri);
      }
    }

    const kernel = new Kernel();
    kernel.addBundle(
      new DatabaseBundle({
        databaseUri: "mysql://localhost:3306/some-db",
      })
    );

    await kernel.init();

    const securityService = kernel.container.get(SecurityService);
    console.log({ uri: securityService.databaseService.databaseUri });

    // Services
    // Injection of Services
    // Injection of Strings
    // Tokens
    // Property Injection
    // Kernel, Bundles fetched from Container
  });

  test("Async Type-safe Events", async () => {
    class UserRegisteredEvent extends Event<{
      userId: string;
    }> {}

    class CustomListener extends Listener {
      @On(UserRegisteredEvent)
      onUserRegistered(e: UserRegisteredEvent) {
        console.log(e);
      }
    }

    class DatabaseBundle extends Bundle {
      async init() {
        await this.warmup([CustomListener]);
      }
    }

    const kernel = new Kernel();
    kernel.addBundle(new DatabaseBundle());

    await kernel.init();

    const eventManager = kernel.container.get(EventManager);

    await eventManager.emit(
      new UserRegisteredEvent({
        userId: "1234",
      })
    );
  });

  test("Bundles life-cycle", async () => {
    class ABundle extends Bundle {
      async hook() {
        const eventManager = this.container.get(EventManager);
        eventManager.addListener(KernelAfterInitEvent, (e) => {
          console.log("A bundle after kernel init");
        });
      }
    }
    class BBundle extends Bundle {
      dependencies = [ABundle];
      async hook() {}
    }

    const kernel = new Kernel({
      bundles: [new BBundle()],
    });
    kernel.onInit(() => {
      console.log("Kernel initialised");
    });
    await kernel.init();
  });

  test.only("Type-safe Exceptions", () => {
    class UserNotAuthorizedException extends Exception<{
      userId: string;
    }> {
      getMessage() {
        return "User not authorized";
      }
    }

    try {
      throw new UserNotAuthorizedException({
        userId: "123",
      });
    } catch (e) {
      if (e instanceof UserNotAuthorizedException) {
        console.error(e.getMessage());
      }
    }
  });
});
