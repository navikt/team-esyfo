# Kotlin Notebooks

Kotlin-notebooks for utforsking, demo og analyse i Team eSyfo.

## Notebooks

| Notebook | Beskrivelse |
|---|---|
| [`coroutines/demo-coroutines.ipynb`](coroutines/demo-coroutines.ipynb) | Grunnleggende Kotlin coroutines |
| [`coroutines/demo-cancellation.ipynb`](coroutines/demo-cancellation.ipynb) | Cancellation og feilhåndtering i coroutines |
| [`coroutines/demo-kafka.ipynb`](coroutines/demo-kafka.ipynb) | Kafka-integrasjon med coroutines |

## Kjøring

Prosjektet bruker Gradle for å hente notebook-avhengigheter og verifisere at
oppsettet bygger:

```sh
./gradlew build --no-daemon
```

Notebooks åpnes i IntelliJ IDEA med [Kotlin Notebook-plugin](https://kotlinlang.org/docs/kotlin-notebook-overview.html).
