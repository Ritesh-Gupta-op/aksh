import unittest


class PackageImportSmokeTest(unittest.TestCase):
    def test_core_package_is_importable(self) -> None:
        import core
        import core.engine

        self.assertIsNotNone(core)
        self.assertIsNotNone(core.engine)


if __name__ == "__main__":
    unittest.main()
