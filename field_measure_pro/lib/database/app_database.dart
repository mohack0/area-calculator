import 'dart:convert';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';
import 'package:path/path.dart' as p;
import '../models/field_model.dart';
import '../models/geo_point.dart';

class AppDatabase {
  static Database? _db;

  static Future<Database> get database async {
    if (_db != null) return _db!;
    _db = await _initDb();
    return _db!;
  }

  static Future<Database> _initDb() async {
    // Section 34: Initialize SQLite FFI on Windows, Linux, and macOS
    if (!kIsWeb && (Platform.isWindows || Platform.isLinux || Platform.isMacOS)) {
      sqfliteFfiInit();
      databaseFactory = databaseFactoryFfi;
    }

    final dbPath = await getDatabasesPath();
    final path = p.join(dbPath, 'field_measure_pro.db');

    return await openDatabase(
      path,
      version: 2,
      onCreate: (db, version) async {
        await db.execute('''
          CREATE TABLE fields (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            createdAt INTEGER NOT NULL,
            updatedAt INTEGER NOT NULL,
            measurementMode TEXT NOT NULL,
            originalGpsPolygon TEXT,
            finalPolygon TEXT NOT NULL,
            areaSqMeters REAL NOT NULL,
            perimeterMeters REAL NOT NULL,
            primaryAreaUnit TEXT NOT NULL,
            primaryDistanceUnit TEXT NOT NULL,
            region TEXT NOT NULL,
            gpsStats TEXT,
            notes TEXT,
            metadata TEXT,
            customAreaUnitName TEXT,
            customAreaUnitSqMeters REAL,
            conversionSnapshot TEXT
          )
        ''');

        await db.execute('''
          CREATE TABLE active_session_draft (
            id TEXT PRIMARY KEY,
            data TEXT NOT NULL,
            lastSaved INTEGER NOT NULL
          )
        ''');

        await db.execute('''
          CREATE TABLE settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
          )
        ''');
      },
      onUpgrade: (db, oldVersion, newVersion) async {
        if (oldVersion < 2) {
          // Section 13: Proper migration preserving existing fields and drafts
          try {
            await db.execute('ALTER TABLE fields ADD COLUMN customAreaUnitName TEXT');
          } catch (_) {}
          try {
            await db.execute('ALTER TABLE fields ADD COLUMN customAreaUnitSqMeters REAL');
          } catch (_) {}
          try {
            await db.execute('ALTER TABLE fields ADD COLUMN conversionSnapshot TEXT');
          } catch (_) {}
          try {
            await db.execute('''
              CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
              )
            ''');
          } catch (_) {}
        }
      },
    );
  }

  static Future<void> insertOrUpdateField(FieldModel field) async {
    final db = await database;
    await db.insert(
      'fields',
      {
        'id': field.id,
        'name': field.name,
        'createdAt': field.createdAt,
        'updatedAt': field.updatedAt,
        'measurementMode': field.measurementMode.name,
        'originalGpsPolygon': field.originalGpsPolygon != null
            ? jsonEncode(field.originalGpsPolygon!.map((p) => p.toJson()).toList())
            : null,
        'finalPolygon':
            jsonEncode(field.finalPolygon.map((p) => p.toJson()).toList()),
        'areaSqMeters': field.areaSqMeters,
        'perimeterMeters': field.perimeterMeters,
        'primaryAreaUnit': field.primaryAreaUnit,
        'primaryDistanceUnit': field.primaryDistanceUnit,
        'region': field.region,
        'gpsStats':
            field.gpsStats != null ? jsonEncode(field.gpsStats!.toJson()) : null,
        'notes': field.notes,
        'metadata':
            field.metadata != null ? jsonEncode(field.metadata) : null,
        'customAreaUnitName': field.customAreaUnitName,
        'customAreaUnitSqMeters': field.customAreaUnitSqMeters,
        'conversionSnapshot': field.conversionSnapshot != null
            ? jsonEncode(field.conversionSnapshot)
            : null,
      },
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
  }

  static Future<List<FieldModel>> getAllFields() async {
    final db = await database;
    final List<Map<String, dynamic>> maps =
        await db.query('fields', orderBy: 'createdAt DESC');

    return maps.map((m) {
      final json = Map<String, dynamic>.from(m);
      json['finalPolygon'] = jsonDecode(m['finalPolygon'] as String);
      if (m['originalGpsPolygon'] != null) {
        json['originalGpsPolygon'] =
            jsonDecode(m['originalGpsPolygon'] as String);
      }
      if (m['gpsStats'] != null) {
        json['gpsStats'] = jsonDecode(m['gpsStats'] as String);
      }
      if (m['metadata'] != null) {
        json['metadata'] = jsonDecode(m['metadata'] as String);
      }
      if (m['conversionSnapshot'] != null) {
        json['conversionSnapshot'] = jsonDecode(m['conversionSnapshot'] as String);
      }
      return FieldModel.fromJson(json);
    }).toList();
  }

  static Future<FieldModel?> getFieldById(String id) async {
    final db = await database;
    final List<Map<String, dynamic>> maps =
        await db.query('fields', where: 'id = ?', whereArgs: [id], limit: 1);

    if (maps.isEmpty) return null;

    final m = maps.first;
    final json = Map<String, dynamic>.from(m);
    json['finalPolygon'] = jsonDecode(m['finalPolygon'] as String);
    if (m['originalGpsPolygon'] != null) {
      json['originalGpsPolygon'] = jsonDecode(m['originalGpsPolygon'] as String);
    }
    if (m['gpsStats'] != null) {
      json['gpsStats'] = jsonDecode(m['gpsStats'] as String);
    }
    if (m['metadata'] != null) {
      json['metadata'] = jsonDecode(m['metadata'] as String);
    }
    if (m['conversionSnapshot'] != null) {
      json['conversionSnapshot'] = jsonDecode(m['conversionSnapshot'] as String);
    }
    return FieldModel.fromJson(json);
  }

  static Future<void> deleteField(String id) async {
    final db = await database;
    await db.delete('fields', where: 'id = ?', whereArgs: [id]);
  }

  // Blocker #1: Crash Recovery & Draft Management with strongly typed state
  static Future<void> saveActiveDraft({
    required String id,
    required String mode,
    String state = 'EDITING',
    required List<GeoPoint> points,
    List<GeoPoint>? originalGpsPoints,
    Map<String, dynamic>? extra,
  }) async {
    try {
      final db = await database;
      final draftData = {
        'id': id,
        'mode': mode,
        'state': state,
        'points': points.map((p) => p.toJson()).toList(),
        'originalGpsPoints': originalGpsPoints?.map((p) => p.toJson()).toList(),
        'extra': extra,
        'updatedAt': DateTime.now().millisecondsSinceEpoch,
      };

      await db.insert(
        'active_session_draft',
        {
          'id': id,
          'data': jsonEncode(draftData),
          'lastSaved': DateTime.now().millisecondsSinceEpoch,
        },
        conflictAlgorithm: ConflictAlgorithm.replace,
      );
    } catch (_) {}
  }

  static Future<Map<String, dynamic>?> getActiveDraft([String id = 'active_draft']) async {
    try {
      final db = await database;
      final results = await db.query(
        'active_session_draft',
        where: 'id = ?',
        whereArgs: [id],
        limit: 1,
      );

      if (results.isNotEmpty) {
        final raw = results.first['data'] as String;
        return jsonDecode(raw) as Map<String, dynamic>;
      }
    } catch (_) {}
    return null;
  }

  static Future<void> clearActiveDraft([String id = 'active_draft']) async {
    try {
      final db = await database;
      await db.delete('active_session_draft', where: 'id = ?', whereArgs: [id]);
    } catch (_) {}
  }

  // Blocker #3: Persist Settings & Custom Units
  static Future<void> saveSetting(String key, String value) async {
    try {
      final db = await database;
      await db.insert(
        'settings',
        {'key': key, 'value': value},
        conflictAlgorithm: ConflictAlgorithm.replace,
      );
    } catch (_) {}
  }

  static Future<String?> getSetting(String key) async {
    try {
      final db = await database;
      final results = await db.query(
        'settings',
        where: 'key = ?',
        whereArgs: [key],
        limit: 1,
      );
      if (results.isNotEmpty) {
        return results.first['value'] as String?;
      }
    } catch (_) {}
    return null;
  }

  static Future<Map<String, String>> getAllSettings() async {
    final map = <String, String>{};
    try {
      final db = await database;
      final results = await db.query('settings');
      for (final row in results) {
        map[row['key'] as String] = row['value'] as String;
      }
    } catch (_) {}
    return map;
  }
}
