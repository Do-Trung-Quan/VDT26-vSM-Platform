import { MigrationInterface, QueryRunner } from "typeorm";

export class InitSchema1782280846265 implements MigrationInterface {
    name = 'InitSchema1782280846265'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "departments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "address" character varying NOT NULL, "description" text, "deleted_at" TIMESTAMP, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_8681da666ad9699d568b3e91064" UNIQUE ("name"), CONSTRAINT "PK_839517a681a86bb84cbcc6a1e9d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."users_role_enum" AS ENUM('USER', 'ADMIN')`);
        await queryRunner.query(`CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "email" character varying NOT NULL, "password_hash" character varying NOT NULL, "full_name" character varying NOT NULL, "employee_id" character varying NOT NULL, "avatar_url" character varying NOT NULL DEFAULT '', "role" "public"."users_role_enum" NOT NULL, "department_id" uuid NOT NULL, "is_active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "UQ_9760615d88ed518196bb79ea03d" UNIQUE ("employee_id"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."meetings_type_enum" AS ENUM('LIVE', 'UPLOAD')`);
        await queryRunner.query(`CREATE TYPE "public"."meetings_status_enum" AS ENUM('LIVE', 'PROCESSING', 'COMPLETED')`);
        await queryRunner.query(`CREATE TABLE "meetings" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "title" character varying NOT NULL, "description" text, "type" "public"."meetings_type_enum" NOT NULL, "host_id" uuid NOT NULL, "department_id" uuid NOT NULL, "status" "public"."meetings_status_enum" NOT NULL, "audio_url" character varying, "duration_seconds" integer, "is_locked" boolean NOT NULL DEFAULT false, "deleted_at" TIMESTAMP, "started_at" TIMESTAMP, "ended_at" TIMESTAMP, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_aa73be861afa77eb4ed31f3ed57" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."notifications_type_enum" AS ENUM('MEETING_CREATED', 'MEETING_STATUS_CHANGED', 'MEETING_INFO_UPDATED')`);
        await queryRunner.query(`CREATE TABLE "notifications" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "meeting_id" uuid NOT NULL, "type" "public"."notifications_type_enum" NOT NULL, "message" character varying NOT NULL, "is_read" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_6a72c3c0f683f6462415e653c3a" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "transcript_blocks" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "meeting_id" uuid NOT NULL, "sequence_number" integer NOT NULL, "text" text NOT NULL, "speaker_label" character varying NOT NULL, "start_time" double precision NOT NULL, "end_time" double precision NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_91eb224cc14770e72d13321766c" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."meeting_summaries_status_enum" AS ENUM('PROCESSING', 'COMPLETED')`);
        await queryRunner.query(`CREATE TABLE "meeting_summaries" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "meeting_id" uuid NOT NULL, "summary_text" text NOT NULL DEFAULT '', "status" "public"."meeting_summaries_status_enum" NOT NULL DEFAULT 'PROCESSING', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_64384456900fcf79042866e95ca" UNIQUE ("meeting_id"), CONSTRAINT "REL_64384456900fcf79042866e95c" UNIQUE ("meeting_id"), CONSTRAINT "PK_5236d73478fa212bd3e7ea8a8fb" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "refresh_tokens" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "token_hash" character varying NOT NULL, "is_revoked" boolean NOT NULL DEFAULT false, "expires_at" TIMESTAMP NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_7d8bee0204106019488c4c50ffa" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "password_reset_otps" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "otp_code" character varying NOT NULL, "is_used" boolean NOT NULL DEFAULT false, "expires_at" TIMESTAMP NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_0b4f4c493a1ee383f93ff3a5017" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "users" ADD CONSTRAINT "FK_0921d1972cf861d568f5271cd85" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "meetings" ADD CONSTRAINT "FK_6bf7c3bf900ea781101614178d0" FOREIGN KEY ("host_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "meetings" ADD CONSTRAINT "FK_997b512fbcfebaeabd401fe8033" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "notifications" ADD CONSTRAINT "FK_9a8a82462cab47c73d25f49261f" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "notifications" ADD CONSTRAINT "FK_2f287864a4a7eb69aa90128c5fa" FOREIGN KEY ("meeting_id") REFERENCES "meetings"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "transcript_blocks" ADD CONSTRAINT "FK_ce1eed15c570b3464182ed61cc3" FOREIGN KEY ("meeting_id") REFERENCES "meetings"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "meeting_summaries" ADD CONSTRAINT "FK_64384456900fcf79042866e95ca" FOREIGN KEY ("meeting_id") REFERENCES "meetings"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "refresh_tokens" ADD CONSTRAINT "FK_3ddc983c5f7bcf132fd8732c3f4" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "password_reset_otps" ADD CONSTRAINT "FK_a4a5ac367f438cfef8fa13e8023" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "password_reset_otps" DROP CONSTRAINT "FK_a4a5ac367f438cfef8fa13e8023"`);
        await queryRunner.query(`ALTER TABLE "refresh_tokens" DROP CONSTRAINT "FK_3ddc983c5f7bcf132fd8732c3f4"`);
        await queryRunner.query(`ALTER TABLE "meeting_summaries" DROP CONSTRAINT "FK_64384456900fcf79042866e95ca"`);
        await queryRunner.query(`ALTER TABLE "transcript_blocks" DROP CONSTRAINT "FK_ce1eed15c570b3464182ed61cc3"`);
        await queryRunner.query(`ALTER TABLE "notifications" DROP CONSTRAINT "FK_2f287864a4a7eb69aa90128c5fa"`);
        await queryRunner.query(`ALTER TABLE "notifications" DROP CONSTRAINT "FK_9a8a82462cab47c73d25f49261f"`);
        await queryRunner.query(`ALTER TABLE "meetings" DROP CONSTRAINT "FK_997b512fbcfebaeabd401fe8033"`);
        await queryRunner.query(`ALTER TABLE "meetings" DROP CONSTRAINT "FK_6bf7c3bf900ea781101614178d0"`);
        await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "FK_0921d1972cf861d568f5271cd85"`);
        await queryRunner.query(`DROP TABLE "password_reset_otps"`);
        await queryRunner.query(`DROP TABLE "refresh_tokens"`);
        await queryRunner.query(`DROP TABLE "meeting_summaries"`);
        await queryRunner.query(`DROP TYPE "public"."meeting_summaries_status_enum"`);
        await queryRunner.query(`DROP TABLE "transcript_blocks"`);
        await queryRunner.query(`DROP TABLE "notifications"`);
        await queryRunner.query(`DROP TYPE "public"."notifications_type_enum"`);
        await queryRunner.query(`DROP TABLE "meetings"`);
        await queryRunner.query(`DROP TYPE "public"."meetings_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."meetings_type_enum"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP TYPE "public"."users_role_enum"`);
        await queryRunner.query(`DROP TABLE "departments"`);
    }

}
