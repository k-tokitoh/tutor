import 'package:english_words/english_words.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

void main() {
  runApp(const MyApp());
}

// ウィジェットは、すべての Flutter アプリを作成する際の元になる要素です。ご覧のように、このアプリ自体がウィジェットです。
// StatelessWidget, StatefulWidget がある
class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    // Flutter には、アプリの状態を管理する強力な方法が多数あります。特に説明しやすいのが、このアプリで採用している ChangeNotifier を使用する方法です。
    return ChangeNotifierProvider(
      create: (context) => MyAppState(),
      child: MaterialApp(
        title: 'Namer App',
        theme: ThemeData(
          useMaterial3: true,
          colorScheme: ColorScheme.fromSeed(seedColor: Colors.green),
        ),
        home: MyHomePage(),
      ),
    );
  }
}

class MyAppState extends ChangeNotifier {
  var current = WordPair.random();

  void getNext() {
    current = WordPair.random();
    notifyListeners();
  }

  var favorites = <WordPair>[];

  void toggleFavorite() {
    if (favorites.contains(current)) {
      removeFavorite(current);
    } else {
      favorites.add(current);
      notifyListeners();
    }
  }

  void removeFavorite(WordPair pair) {
    favorites.remove(pair);
    notifyListeners();
  }
}

class MyHomePage extends StatefulWidget {
  const MyHomePage({super.key});

  @override
  State<MyHomePage> createState() => _MyHomePageState();
}

// 先頭に_をつけるとプライベートになる
class _MyHomePageState extends State<MyHomePage> {
  var selectedIndex = 0;

  // widgetは必ずbuildメソッドをもつ。widget or widgetのネストしたツリーを返す
  @override
  Widget build(BuildContext context) {
    Widget page;

    page = GeneratorPage();

    switch (selectedIndex) {
      case 0:
        page = GeneratorPage();
        break;
      case 1:
        // Placeholderは仮置きのwidget
        // page = const Placeholder();
        page = FavoritesPage();
        break;
      default:
        throw UnimplementedError('no widget for $selectedIndex');
    }

    // LayoutBuilderは、親ウィジェットのサイズに応じてレイアウトを変更するウィジェット
    return LayoutBuilder(builder: (context, constraints) {
      // Scaffoldは、アプリケーションの基本的な構造を提供するウィジェット（？）
      return Scaffold(
        body: Row(
          children: [
            // SafeAreaでノッチとかを考慮してくれる
            SafeArea(
              child: NavigationRail(
                // extended: falseだとアイコンのみ、trueだとラベルも表示する
                extended: constraints.maxWidth > 600,
                destinations: const [
                  NavigationRailDestination(
                    icon: Icon(Icons.home),
                    label: Text('Home'),
                  ),
                  NavigationRailDestination(
                    icon: Icon(Icons.favorite),
                    label: Text('Favorites'),
                  ),
                ],
                selectedIndex: selectedIndex,
                onDestinationSelected: (value) {
                  // Stateの内部ではsetState()をつかえる
                  setState(() {
                    selectedIndex = value;
                  });
                },
              ),
            ),
            // Expandedで、余った幅をとりにいく
            Expanded(
              child: Container(
                color: Theme.of(context).colorScheme.primaryContainer,
                child: page,
              ),
            ),
          ],
        ),
      );
    });
  }
}

class GeneratorPage extends StatelessWidget {
  const GeneratorPage({super.key});

  @override
  Widget build(BuildContext context) {
    var appState = context.watch<MyAppState>();
    var pair = appState.current;

    IconData icon;
    // 地の文で書けばnotifyされたタイミングで更新される
    if (appState.favorites.contains(pair)) {
      icon = Icons.favorite;
    } else {
      icon = Icons.favorite_border;
    }

    return Center(
      child: Column(
        // mainAxisAlignment: MainAxisAlignment.center,
        children: [
          BigCard(pair: pair),
          const SizedBox(height: 10),
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              // ElevatedButton.icon で icon: ... を指定するとアイコン付きのボタンになる
              ElevatedButton.icon(
                onPressed: () {
                  appState.toggleFavorite();
                },
                icon: Icon(icon),
                label: const Text('Like'),
              ),
              const SizedBox(width: 10),
              ElevatedButton(
                onPressed: () {
                  appState.getNext();
                },
                child: const Text('Next'),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class BigCard extends StatelessWidget {
  const BigCard({
    super.key,
    required this.pair,
  });

  final WordPair pair;

  @override
  Widget build(BuildContext context) {
    // 現在のcontextのテーマを取得
    final theme = Theme.of(context);

    // displayは見出しの意味
    // copyWith()で、引数での指定のみ変更されたテキストスタイルを表現するオブジェクトのコピーが返る
    final style = theme.textTheme.displayMedium!.copyWith(
      // primary colorの上に適した色
      color: theme.colorScheme.onPrimary,
    );

    return Card(
      // テーマのプライマリカラーを背景色に設定
      color: theme.colorScheme.primary,
      // 浮き上がり = 影の深さ
      elevation: 8,
      child: Padding(
        padding: const EdgeInsets.all(30.0),
        child: Text(
          pair.asLowerCase,
          style: style,
          // screen readerに読み上げ対象として渡されるラベル
          semanticsLabel: '${pair.first} ${pair.second}',
        ),
      ),
    );
  }
}

class FavoritesPage extends StatelessWidget {
  const FavoritesPage({super.key});

  @override
  Widget build(BuildContext context) {
    var appState = context.watch<MyAppState>();

    if (appState.favorites.isEmpty) {
      return const Center(
        child: Text('No favorites yet!'),
      );
    }
    // return Text(appState.current.asCamelCase);
    return ListView(
      children: [
        // Padding(
        //   padding: const EdgeInsets.all(20),
        //   child: Text('You have '
        //       '${appState.favorites.length} favorites:'),
        // ),
        ...appState.favorites.map((pair) {
          return ListTile(
              leading: const Icon(Icons.square),
              title: Text(pair.asLowerCase),
              trailing: ElevatedButton(
                child: Text('delete'),
                onPressed: () {
                  appState.removeFavorite(pair);
                },
              ));
        }).toList()
      ],
    );
  }
}
