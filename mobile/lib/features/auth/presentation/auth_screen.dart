import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/features/auth/presentation/auth_controller.dart';

class AuthScreen extends ConsumerStatefulWidget {
  const AuthScreen({super.key});

  @override
  ConsumerState<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends ConsumerState<AuthScreen> {
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _nameController = TextEditingController();

  bool _isLogin = true;
  bool _isHost = false; // Default to Client

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(authControllerProvider);

    ref.listen(authControllerProvider, (previous, next) {
      if (next.error != null) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(next.error!)),
        );
      }
    });

    return Scaffold(
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                _isHost ? 'Host Portal' : 'Chat Client',
                style: Theme.of(context).textTheme.headlineMedium,
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 32),
              
              // Host/Client Toggle
              SegmentedButton<bool>(
                segments: const [
                   ButtonSegment(value: false, label: Text('Client')),
                   ButtonSegment(value: true, label: Text('Host')),
                ],
                selected: {_isHost},
                onSelectionChanged: (Set<bool> newSelection) {
                  setState(() {
                    _isHost = newSelection.first;
                  });
                },
              ),
              const SizedBox(height: 24),

              if (!_isLogin)
                TextField(
                  controller: _nameController,
                  decoration: const InputDecoration(labelText: 'Name'),
                ),
              if (!_isLogin) const SizedBox(height: 16),

              TextField(
                controller: _emailController,
                decoration: const InputDecoration(labelText: 'Email'),
                keyboardType: TextInputType.emailAddress,
              ),
              const SizedBox(height: 16),
              TextField(
                controller: _passwordController,
                decoration: const InputDecoration(labelText: 'Password'),
                obscureText: true,
              ),
              const SizedBox(height: 24),

              if (state.isLoading)
                const Center(child: CircularProgressIndicator())
              else
                FilledButton(
                  onPressed: _submit,
                  child: Text(_isLogin ? 'Login' : 'Register'),
                ),
              
              TextButton(
                onPressed: () {
                  setState(() {
                    _isLogin = !_isLogin;
                  });
                },
                child: Text(_isLogin ? 'Create an account' : 'Have an account? Login'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _submit() {
    final email = _emailController.text;
    final password = _passwordController.text;

    if (_isLogin) {
      if (_isHost) {
        ref.read(authControllerProvider.notifier).loginHost(email, password);
      } else {
        ref.read(authControllerProvider.notifier).loginClient(email, password);
      }
    } else {
      // Register logic todo
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Registration logic not implemented yet')),
      );
    }
  }
}
